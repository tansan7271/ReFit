/**
 * 온보딩 2/5 — 수면 목표 시간 (기상 / 취침).
 * 두 시각으로부터 예상 수면 시간을 계산해 안내한다.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { TimeField } from '@/components/ui/TimeField';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius } from '@/constants/typography';
import { useOnboardingStore } from '@/store/onboardingStore';

/** "HH:mm" → 자정 기준 분 */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 취침→기상 수면 시간(분). 자정을 넘기는 경우 처리 */
function sleepDuration(bed: string, wake: string): number {
  const diff = toMinutes(wake) - toMinutes(bed);
  return diff <= 0 ? diff + 24 * 60 : diff;
}

export default function SleepGoalScreen() {
  const router = useRouter();
  const sleepGoal = useOnboardingStore((s) => s.sleepGoal);
  const setSleepGoal = useOnboardingStore((s) => s.setSleepGoal);

  const durationLabel = useMemo(() => {
    const mins = sleepDuration(sleepGoal.bedTime, sleepGoal.wakeTime);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
  }, [sleepGoal]);

  /** 취침/기상 시각이 동일하면 수면 시간을 계산할 수 없어 진행을 막는다. */
  const sameTime = sleepGoal.bedTime === sleepGoal.wakeTime;

  return (
    <OnboardingScreen
      step="sleep-goal"
      title="수면 목표를 정해요"
      subtitle="수면 패턴에 맞춰 회복 가이드를 추천해 드려요"
      nextEnabled={!sameTime}
      onNext={() => router.push('/(onboarding)/physical-profile')}
      onBack={() => router.back()}
    >
      <TimeField
        label="취침 시간"
        value={sleepGoal.bedTime}
        onChange={(bedTime) => setSleepGoal({ bedTime })}
      />
      <TimeField
        label="기상 시간"
        value={sleepGoal.wakeTime}
        onChange={(wakeTime) => setSleepGoal({ wakeTime })}
      />

      {sameTime ? (
        <Text style={styles.warning}>
          취침 시각과 기상 시각이 같을 수 없어요
        </Text>
      ) : (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>목표 수면 시간</Text>
          <Text style={styles.summaryValue}>{durationLabel}</Text>
        </View>
      )}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: colors.softBlue,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.text2,
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    color: colors.accent,
  },
  warning: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.heavy,
    color: colors.pink,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
