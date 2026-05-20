/**
 * 통합 헬스 서비스 레이어
 * iOS  → react-native-health (HealthKit)
 * Android → react-native-health-connect (Health Connect)
 *
 * UI/스토어는 이 모듈만 호출하면 되고 플랫폼 분기는 여기서 흡수한다.
 *
 * 주의: react-native-health / react-native-health-connect 는 Expo Go 에서
 *       동작하지 않는다. 반드시 EAS development build 가 필요하다.
 *       (managed workflow 아님 — 네이티브 모듈 포함)
 */
import { Platform } from 'react-native';

/** 헬스 연동 시도 결과 */
export interface HealthLinkResult {
  /** 권한 부여 성공 여부 */
  granted: boolean;
  /** 사용 불가 사유 (성공 시 null) */
  reason: 'denied' | 'unavailable' | 'error' | null;
  /** 사용자 노출용 메시지 */
  message: string;
}

/** 플랫폼별 표시 정보 — health-connect.tsx UI 분기에 사용 */
export function getHealthProviderInfo(): {
  name: string;
  description: string;
} {
  if (Platform.OS === 'ios') {
    return {
      name: 'Apple 건강',
      description: '수면 · 심박 · 활동량 · 체중을 자동으로 가져와요',
    };
  }
  return {
    name: 'Google Health Connect',
    description: '수면 · 활동량 · 체성분을 자동으로 가져와요',
  };
}

// ---------------------------------------------------------------------------
// iOS — react-native-health
// ---------------------------------------------------------------------------
async function requestHealthKit(): Promise<HealthLinkResult> {
  try {
    // 동적 import — Expo Go 등 네이티브 모듈 부재 환경에서 크래시 방지
    const AppleHealthKit = (await import('react-native-health')).default;
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.BodyMass,
        ],
        write: [AppleHealthKit.Constants.Permissions.Workout],
      },
    };

    return await new Promise<HealthLinkResult>((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          resolve({
            granted: false,
            reason: 'denied',
            message:
              '건강 데이터 권한이 거부됐어요. 나중에 설정에서 변경할 수 있어요.',
          });
          return;
        }
        resolve({
          granted: true,
          reason: null,
          message: 'Apple 건강과 연동됐어요!',
        });
      });
    });
  } catch {
    return {
      granted: false,
      reason: 'unavailable',
      message:
        '이 환경에서는 건강 연동을 사용할 수 없어요. (개발 빌드가 필요해요)',
    };
  }
}

// ---------------------------------------------------------------------------
// Android — react-native-health-connect
// ---------------------------------------------------------------------------
async function requestHealthConnect(): Promise<HealthLinkResult> {
  try {
    const HC = await import('react-native-health-connect');

    // Health Connect 설치/가용성 확인 (Android 14+ 권장)
    const status = await HC.getSdkStatus();
    if (status !== HC.SdkAvailabilityStatus.SDK_AVAILABLE) {
      return {
        granted: false,
        reason: 'unavailable',
        message:
          'Health Connect 앱이 필요해요. 설치 후 다시 시도하거나 직접 입력해 주세요.',
      };
    }

    await HC.initialize();
    const granted = await HC.requestPermission([
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      { accessType: 'read', recordType: 'Weight' },
    ]);

    if (!granted || granted.length === 0) {
      return {
        granted: false,
        reason: 'denied',
        message:
          '건강 데이터 권한이 거부됐어요. 나중에 설정에서 변경할 수 있어요.',
      };
    }

    return {
      granted: true,
      reason: null,
      message: 'Health Connect와 연동됐어요!',
    };
  } catch {
    return {
      granted: false,
      reason: 'unavailable',
      message:
        '이 환경에서는 건강 연동을 사용할 수 없어요. (개발 빌드가 필요해요)',
    };
  }
}

/**
 * 헬스 앱 연동 권한 요청.
 * 플랫폼에 따라 HealthKit 또는 Health Connect 를 호출한다.
 */
export async function requestHealthPermissions(): Promise<HealthLinkResult> {
  if (Platform.OS === 'ios') {
    return requestHealthKit();
  }
  if (Platform.OS === 'android') {
    return requestHealthConnect();
  }
  return {
    granted: false,
    reason: 'unavailable',
    message: '이 플랫폼에서는 건강 연동을 지원하지 않아요.',
  };
}
