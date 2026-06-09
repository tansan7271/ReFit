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
      description: '수면 · 심박수 · 걸음수 · 활동 칼로리를 자동으로 가져와요',
    };
  }
  return {
    name: 'Google Health Connect',
    description: '수면 · 심박수 · 걸음수 · 활동 칼로리를 자동으로 가져와요',
  };
}

// ---------------------------------------------------------------------------
// iOS — react-native-health
// ---------------------------------------------------------------------------
async function requestHealthKit(): Promise<HealthLinkResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NativeModules } = require('react-native');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Constants } = require('react-native-health');
    const AppleHealthKit = NativeModules?.AppleHealthKit;

    if (!AppleHealthKit || typeof AppleHealthKit.initHealthKit !== 'function') {
      return {
        granted: false,
        reason: 'unavailable',
        message: '이 환경에서는 건강 연동을 사용할 수 없어요. (개발 빌드가 필요해요)',
      };
    }

    const permissions = {
      permissions: {
        read: [
          Constants.Permissions.SleepAnalysis,
          Constants.Permissions.HeartRate,
          Constants.Permissions.RestingHeartRate,
          Constants.Permissions.StepCount,
          Constants.Permissions.ActiveEnergyBurned,
        ],
        write: [],
      },
    };

    return await new Promise<HealthLinkResult>((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          resolve({
            granted: false,
            reason: 'denied',
            message: '건강 데이터 권한이 거부됐어요. 나중에 설정에서 변경할 수 있어요.',
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
  } catch (e) {
    console.error('[HealthKit] error:', e);
    return {
      granted: false,
      reason: 'unavailable',
      message: '이 환경에서는 건강 연동을 사용할 수 없어요. (개발 빌드가 필요해요)',
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
      { accessType: 'read', recordType: 'RestingHeartRate' },
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
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

// ---------------------------------------------------------------------------
// Sync helpers
// ---------------------------------------------------------------------------

import type { DailyMetricsItem, SleepSyncItem } from '@/services/api';
import { syncHealthMetrics, syncSleep } from '@/services/api';

function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

// ── iOS HealthKit ─────────────────────────────────────────────────────────────

async function syncSleepIOS(AppleHealthKit: unknown): Promise<void> {
  const hk = AppleHealthKit as Record<string, (...args: unknown[]) => void>;
  const endDate = new Date();
  const startDate = new Date(Date.now() - 30 * 86400_000);
  const opts = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };

  const samples = await new Promise<Record<string, string>[]>((resolve) => {
    hk.getSleepSamples(opts, (err: unknown, res: Record<string, string>[]) =>
      resolve(err ? [] : res),
    );
  });

  if (samples.length === 0) return;

  const STAGE_TYPES = new Set(['DEEP', 'CORE', 'REM', 'AWAKE', 'ASLEEP',
    'INBED', 'ASLEEPCORE', 'ASLEEPDEEP', 'ASLEEPREM', 'ASLEEPUNSPECIFIED']);

  // 모든 수면 샘플을 2시간 이상 공백 기준으로 클러스터링 → 세션 합성
  // ASLEEP/INBED 컨테이너 분기를 쓰면 최근 날짜처럼 스테이지만 있는 경우를 놓침
  const stages = samples.filter((s) => STAGE_TYPES.has(s.value));
  const sorted = [...stages].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  type RawSession = { startMs: number; endMs: number; startIso: string; endIso: string };
  const GAP_MS = 2 * 60 * 60 * 1000;
  const rawSessions: RawSession[] = [];
  let cur: RawSession | null = null;
  for (const s of sorted) {
    const sMs = new Date(s.startDate).getTime();
    const eMs = new Date(s.endDate).getTime();
    if (!cur || sMs - cur.endMs > GAP_MS) {
      if (cur) rawSessions.push(cur);
      cur = { startMs: sMs, endMs: eMs, startIso: s.startDate, endIso: s.endDate };
    } else {
      if (eMs > cur.endMs) { cur.endMs = eMs; cur.endIso = s.endDate; }
    }
  }
  if (cur) rawSessions.push(cur);

  const records: SleepSyncItem[] = rawSessions.map((sess) => {
    let deep = 0, rem = 0, light = 0, awake = 0;
    for (const s of stages) {
      const t = new Date(s.startDate).getTime();
      if (t < sess.startMs || t >= sess.endMs) continue;
      const dur = minutesBetween(s.startDate, s.endDate);
      const v = s.value;
      if (v === 'DEEP' || v === 'ASLEEPDEEP') deep += dur;
      else if (v === 'REM' || v === 'ASLEEPREM') rem += dur;
      else if (v === 'CORE' || v === 'ASLEEPCORE' || v === 'ASLEEP' || v === 'ASLEEPUNSPECIFIED') light += dur;
      else if (v === 'AWAKE') awake += dur;
    }
    return {
      sleep_start: sess.startIso,
      sleep_end: sess.endIso,
      deep_sleep_minutes: deep || null,
      rem_sleep_minutes: rem || null,
      light_sleep_minutes: light || null,
      awake_minutes: awake || null,
      source: 2,
    };
  });

  console.log('[health] sleep records to sync:', records.length,
    records.map((r) => ({ start: r.sleep_start, end: r.sleep_end })));
  if (records.length > 0) await syncSleep(records);
}

async function syncDailyMetricsIOS(AppleHealthKit: unknown): Promise<void> {
  const hk = AppleHealthKit as Record<string, (...args: unknown[]) => void>;
  const endDate = new Date();
  const startDate = new Date(Date.now() - 7 * 86400_000);
  const opts = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };

  type HKSample = { startDate: string; endDate: string; value: number };
  const cb = (resolve: (v: HKSample[]) => void) =>
    (err: unknown, d: HKSample[]) => resolve(err ? [] : d);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const cbStep = (resolve: (v: number) => void) =>
    (err: unknown, d: { value?: number }) => resolve(err || !d ? 0 : (d.value ?? 0));

  const [stepSamples, calSamples, restHRSamples, hrSamples, todaySteps] = await Promise.all([
    new Promise<HKSample[]>((r) =>
      hk.getDailyStepCountSamples({ ...opts, period: 1440 }, cb(r))),
    new Promise<HKSample[]>((r) =>
      hk.getActiveEnergyBurned(opts, cb(r))),
    new Promise<HKSample[]>((r) =>
      hk.getRestingHeartRateSamples(opts, cb(r))),
    new Promise<HKSample[]>((r) =>
      hk.getHeartRateSamples({ ...opts, ascending: true }, cb(r))),
    new Promise<number>((r) =>
      hk.getStepCount(
        { startDate: todayStart.toISOString(), endDate: endDate.toISOString() },
        cbStep(r),
      )),
  ]);

  console.log('[health] iOS samples — steps:', stepSamples.length,
    'cal:', calSamples.length, 'restHR:', restHRSamples.length, 'hr:', hrSamples.length,
    'todaySteps:', todaySteps);

  type DayBucket = { steps: number; cal: number; restHR: number[]; hr: number[] };
  const days = new Map<string, DayBucket>();
  const toLocalDate = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const bucket = (iso: string): DayBucket => {
    const d = toLocalDate(iso);
    if (!days.has(d)) days.set(d, { steps: 0, cal: 0, restHR: [], hr: [] });
    return days.get(d)!;
  };

  for (const s of stepSamples) bucket(s.startDate).steps += s.value;
  for (const s of calSamples) bucket(s.startDate).cal += s.value;
  for (const s of restHRSamples) bucket(s.startDate).restHR.push(s.value);
  for (const s of hrSamples) bucket(s.startDate).hr.push(s.value);

  // getDailyStepCountSamples 가 오늘 partial day를 누락하는 경우 대비해 직접 조회값으로 보강
  if (todaySteps > 0) {
    const tb = bucket(todayStart.toISOString());
    if (todaySteps > tb.steps) tb.steps = todaySteps;
  }

  const validHR = (bpm: number) => bpm >= 20 && bpm <= 250;

  const metrics: DailyMetricsItem[] = Array.from(days.entries())
    .filter(([, v]) => v.steps > 0 || v.cal > 0 || v.restHR.length > 0 || v.hr.length > 0)
    .map(([date, v]) => {
      const validRestHR = v.restHR.filter(validHR);
      const validAvgHR = v.hr.filter(validHR);
      return {
        date,
        steps: v.steps ? Math.round(v.steps) : null,
        active_calories_kcal: v.cal || null,
        resting_heart_rate_bpm: validRestHR.length ? validRestHR[validRestHR.length - 1] : null,
        avg_heart_rate_bpm: validAvgHR.length
          ? validAvgHR.reduce((a, b) => a + b, 0) / validAvgHR.length
          : null,
        source: 2,
      };
    });

  console.log('[health] iOS metrics to sync:', metrics.length, metrics.map(m => `${m.date}(${m.steps})`));
  if (metrics.length > 0) await syncHealthMetrics(metrics);
}

// ── Android Health Connect ────────────────────────────────────────────────────

async function syncSleepAndroid(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HC = require('react-native-health-connect');
  const status = await HC.getSdkStatus();
  if (status !== HC.SdkAvailabilityStatus.SDK_AVAILABLE) return;
  await HC.initialize();
  const granted: { accessType: string; recordType: string }[] = await HC.getGrantedPermissions();
  if (!granted.some((p) => p.accessType === 'read' && p.recordType === 'SleepSession')) return;
  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - 30 * 86400_000).toISOString();

  const { records } = await HC.readRecords('SleepSession', {
    timeRangeFilter: { operator: 'between', startTime, endTime },
  });

  if (!records?.length) return;

  const items: SleepSyncItem[] = (records as Record<string, unknown>[]).map((sess) => {
    let deep = 0, rem = 0, light = 0, awake = 0;
    // HC stage: 1=awake, 2=sleep(generic), 4=light, 5=deep, 6=rem
    for (const stage of (sess.stages as Record<string, unknown>[] | undefined) ?? []) {
      const dur = minutesBetween(stage.startTime as string, stage.endTime as string);
      const t = stage.stage as number;
      if (t === 5) deep += dur;
      else if (t === 6) rem += dur;
      else if (t === 4 || t === 2) light += dur;
      else if (t === 1) awake += dur;
    }
    return {
      sleep_start: sess.startTime as string,
      sleep_end: sess.endTime as string,
      deep_sleep_minutes: deep || null,
      rem_sleep_minutes: rem || null,
      light_sleep_minutes: light || null,
      awake_minutes: awake || null,
      source: 3,
    };
  });

  if (items.length > 0) await syncSleep(items);
}

async function syncDailyMetricsAndroid(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HC = require('react-native-health-connect');
  const status = await HC.getSdkStatus();
  if (status !== HC.SdkAvailabilityStatus.SDK_AVAILABLE) return;
  await HC.initialize();
  const granted: { accessType: string; recordType: string }[] = await HC.getGrantedPermissions();
  if (!granted.some((p) => p.accessType === 'read' && p.recordType === 'Steps')) return;
  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - 7 * 86400_000).toISOString();
  const timeRange = { timeRangeFilter: { operator: 'between' as const, startTime, endTime } };

  const [stepsRes, calRes, restHRRes, hrRes] = await Promise.all([
    HC.readRecords('Steps', timeRange),
    HC.readRecords('ActiveCaloriesBurned', timeRange),
    HC.readRecords('RestingHeartRate', timeRange),
    HC.readRecords('HeartRate', timeRange),
  ]);

  type DayBucket = { steps: number; cal: number; restHR: number[]; hr: number[] };
  const days = new Map<string, DayBucket>();
  const toLocalDate = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const bucket = (iso: string): DayBucket => {
    const d = toLocalDate(iso);
    if (!days.has(d)) days.set(d, { steps: 0, cal: 0, restHR: [], hr: [] });
    return days.get(d)!;
  };

  for (const r of ((stepsRes as Record<string, unknown>).records as Record<string, unknown>[] | undefined) ?? [])
    bucket(r.startTime as string).steps += (r.count as number) ?? 0;

  for (const r of ((calRes as Record<string, unknown>).records as Record<string, unknown>[] | undefined) ?? [])
    bucket(r.startTime as string).cal +=
      ((r.energy as Record<string, number> | undefined)?.inKilocalories) ?? 0;

  for (const r of ((restHRRes as Record<string, unknown>).records as Record<string, unknown>[] | undefined) ?? [])
    bucket(r.time as string).restHR.push((r.beatsPerMinute as number) ?? 0);

  for (const r of ((hrRes as Record<string, unknown>).records as Record<string, unknown>[] | undefined) ?? [])
    for (const s of (r.samples as Record<string, number>[] | undefined) ?? [])
      bucket(r.startTime as string).hr.push(s.beatsPerMinute ?? 0);

  const validHR = (bpm: number) => bpm >= 20 && bpm <= 250;

  const metrics: DailyMetricsItem[] = Array.from(days.entries())
    .filter(([, v]) => v.steps > 0 || v.cal > 0 || v.restHR.length > 0 || v.hr.length > 0)
    .map(([date, v]) => {
      const validRestHR = v.restHR.filter(validHR);
      const validAvgHR = v.hr.filter(validHR);
      return {
        date,
        steps: v.steps ? Math.round(v.steps) : null,
        active_calories_kcal: v.cal || null,
        resting_heart_rate_bpm: validRestHR.length ? validRestHR[validRestHR.length - 1] : null,
        avg_heart_rate_bpm: validAvgHR.length
          ? validAvgHR.reduce((a, b) => a + b, 0) / validAvgHR.length
          : null,
        source: 3,
      };
    });

  if (metrics.length > 0) await syncHealthMetrics(metrics);
}

// ---------------------------------------------------------------------------
// Public sync API
// ---------------------------------------------------------------------------

/**
 * react-native-health 은 Object.assign({}, NativeModules.AppleHealthKit) 으로
 * 래핑하는데, NativeModule 메서드가 non-enumerable 인 경우 복사가 누락된다.
 * NativeModules.AppleHealthKit 을 직접 참조하면 이 문제를 우회할 수 있다.
 *
 * HealthKit은 앱 세션마다 initHealthKit 을 호출해야 읽기 API가 동작한다.
 * 이미 권한이 부여된 경우 UI 없이 즉시 완료된다.
 */
async function getNativeHealthKit(): Promise<Record<string, unknown> | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NativeModules } = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Constants } = require('react-native-health');
  const hk = NativeModules?.AppleHealthKit;
  if (!hk || typeof hk.initHealthKit !== 'function') return null;

  const permissions = {
    permissions: {
      read: [
        Constants.Permissions.SleepAnalysis,
        Constants.Permissions.HeartRate,
        Constants.Permissions.RestingHeartRate,
        Constants.Permissions.StepCount,
        Constants.Permissions.ActiveEnergyBurned,
      ],
      write: [],
    },
  };

  const ok = await new Promise<boolean>((resolve) => {
    hk.initHealthKit(permissions, (err: string) => resolve(!err));
  });

  return ok ? (hk as Record<string, unknown>) : null;
}

/**
 * 최근 30일 수면 데이터를 헬스 앱에서 읽어 백엔드에 upsert한다.
 * 앱 포어그라운드 진입 시 하루 1회 호출. 오류는 무시(silent).
 */
export async function syncSleepData(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      const hk = await getNativeHealthKit();
      if (!hk) return;
      await syncSleepIOS(hk);
    } else if (Platform.OS === 'android') {
      await syncSleepAndroid();
    }
  } catch (e) {
    console.error('[health] syncSleepData error', e);
  }
}

/**
 * 최근 7일 걸음수·칼로리·심박수를 헬스 앱에서 읽어 백엔드에 upsert한다.
 * pre-workout 화면 진입 시마다 호출. 오류는 무시(silent).
 */
export async function syncDailyMetrics(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      const hk = await getNativeHealthKit();
      if (!hk) return;
      await syncDailyMetricsIOS(hk);
    } else if (Platform.OS === 'android') {
      await syncDailyMetricsAndroid();
    }
  } catch (e) {
    console.error('[health] syncDailyMetrics error', e);
  }
}
