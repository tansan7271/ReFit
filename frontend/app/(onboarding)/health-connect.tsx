/**
 * 온보딩 4/5 — 헬스 앱 연동 권한 요청.
 * iOS → Apple 건강(HealthKit), Android → Google Health Connect.
 * 연동 성공/실패 모두 다음 단계로 진행 가능 (선택 사항).
 */
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius } from '@/constants/typography';
import {
  getHealthProviderInfo,
  requestHealthPermissions,
} from '@/services/health';
import { useOnboardingStore } from '@/store/onboardingStore';

type LinkState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'linked'; message: string }
  | { kind: 'failed'; message: string };

export default function HealthConnectScreen() {
  const router = useRouter();
  const setHealthLinked = useOnboardingStore((s) => s.setHealthLinked);
  const [state, setState] = useState<LinkState>({ kind: 'idle' });

  const provider = getHealthProviderInfo();
  const isLinked = state.kind === 'linked';

  const handleConnect = async () => {
    setState({ kind: 'requesting' });
    const result = await requestHealthPermissions();
    if (result.granted) {
      setHealthLinked(true);
      setState({ kind: 'linked', message: result.message });
    } else {
      // 거부/불가 모두 진행은 가능 — 수동 입력 폴백 안내
      setHealthLinked(false);
      setState({ kind: 'failed', message: result.message });
    }
  };

  return (
    <OnboardingScreen
      step="health-connect"
      title="건강 데이터 연동"
      subtitle={`연동하면 수동 입력 없이\n${provider.description}`}
      nextEnabled
      nextLabel={isLinked ? '다음 →' : '나중에 하기'}
      onNext={() => router.push('/(onboarding)/character-intro')}
      onBack={() => router.back()}
    >
      {/* 연동 카드 */}
      <View style={[styles.card, isLinked && styles.cardLinked]}>
        <Text style={styles.platformIcon}>
          {Platform.OS === 'ios' ? '🍎' : '🤖'}
        </Text>
        <View style={styles.cardText}>
          <Text style={styles.providerName}>{provider.name}</Text>
          <Text style={styles.providerDesc}>{provider.description}</Text>
        </View>
        {isLinked ? <Text style={styles.linkedBadge}>연동됨</Text> : null}
      </View>

      {/* 상태 메시지 */}
      {state.kind === 'linked' ? (
        <Text style={styles.successText}>{state.message}</Text>
      ) : null}
      {state.kind === 'failed' ? (
        <Text style={styles.errorText}>{state.message}</Text>
      ) : null}

      {/* 연동 버튼 — 성공 후엔 숨김 */}
      {!isLinked ? (
        <PrimaryButton
          label={Platform.OS === 'ios' ? 'Apple 건강 연동' : 'Health Connect 연동'}
          onPress={handleConnect}
          loading={state.kind === 'requesting'}
        />
      ) : null}

      <Text style={styles.note}>
        연동은 선택 사항이에요. 건너뛰어도 운동 정보를 직접 입력하면
        ReFit을 그대로 쓸 수 있어요.
      </Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  cardLinked: {
    borderColor: colors.green,
    backgroundColor: colors.softGreen,
  },
  platformIcon: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  providerDesc: {
    fontSize: fontSize.xs,
    color: colors.text2,
    lineHeight: 16,
  },
  linkedBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.green,
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.green,
    fontWeight: fontWeight.semibold,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.accent2,
    fontWeight: fontWeight.semibold,
    lineHeight: 18,
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.text3,
    lineHeight: 17,
  },
});
