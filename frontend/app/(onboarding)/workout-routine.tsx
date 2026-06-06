/**
 * 온보딩 1/5 — 요일별 루틴 설정.
 * 상단 요일 칩으로 편집할 요일을 고르고,
 * 하단에서 해당 요일의 운동 부위(멀티 선택)를 지정한다.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Chip } from '@/components/ui/Chip';
import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { colors } from '@/constants/colors';
import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  WEEKDAY_LABEL,
  WEEKDAY_ORDER,
} from '@/constants/labels';
import { fontSize, fontWeight, radius } from '@/constants/typography';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { Weekday } from '@/types';

export default function WorkoutRoutineScreen() {
  const router = useRouter();
  const routines = useOnboardingStore((s) => s.routines);
  const toggleBodyPart = useOnboardingStore((s) => s.toggleBodyPart);

  // 현재 편집 중인 요일 (기본: 월)
  const [activeDay, setActiveDay] = useState<Weekday>('mon');

  const activeRoutine = useMemo(
    () => routines.find((r) => r.day === activeDay)!,
    [routines, activeDay],
  );

  // 최소 1개 요일에 운동이 설정되어야 다음 진행 가능
  const hasAnyRoutine = useMemo(
    () => routines.some((r) => r.bodyParts.length > 0),
    [routines],
  );

  /** 요일에 설정된 운동이 있으면 해당 요일 칩을 채움 표시 */
  const isDayFilled = (day: Weekday): boolean => {
    const r = routines.find((x) => x.day === day)!;
    return r.bodyParts.length > 0;
  };

  return (
    <OnboardingScreen
      step="workout-routine"
      title="요일별 운동 루틴"
      subtitle="운동하는 요일을 고르고 부위를 설정해요"
      nextEnabled={hasAnyRoutine}
      onNext={() => router.push('/(onboarding)/sleep-goal')}
    >
      {/* 요일 칩 행 */}
      <View style={styles.dayRow}>
        {WEEKDAY_ORDER.map((day) => {
          const active = day === activeDay;
          const filled = isDayFilled(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${WEEKDAY_LABEL[day]}요일`}
              onPress={() => setActiveDay(day)}
              style={[
                styles.dayChip,
                filled && styles.dayChipFilled,
                active && styles.dayChipActive,
              ]}
            >
              <Text
                style={[
                  styles.dayChipText,
                  active && styles.dayChipTextOn,
                ]}
              >
                {WEEKDAY_LABEL[day]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 선택 요일의 운동 부위 설정 */}
      <Text style={styles.sectionTitle}>
        {WEEKDAY_LABEL[activeDay]}요일 운동 부위
      </Text>

      <View style={styles.chipWrap}>
        {BODY_PART_ORDER.map((part) => (
          <Chip
            key={part}
            label={BODY_PART_LABEL[part]}
            selected={activeRoutine.bodyParts.includes(part)}
            onPress={() => toggleBodyPart(activeDay, part)}
          />
        ))}
      </View>

      <Text style={styles.hint}>
        쉬는 날은 비워두면 돼요. 최소 하루는 설정해 주세요.
      </Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipFilled: {
    borderColor: colors.green,
    backgroundColor: colors.softGreen,
  },
  dayChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  dayChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text2,
  },
  dayChipTextOn: {
    color: colors.white,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginTop: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.text3,
    marginTop: 4,
    lineHeight: 16,
  },
});
