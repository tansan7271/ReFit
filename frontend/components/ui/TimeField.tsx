/**
 * 시간 입력 필드 — 시/분 +/- 스테퍼.
 * 외부 datetime-picker 의존 없이 가볍게 구현 (온보딩 단순 입력 용도).
 * 값 포맷은 24시간 "HH:mm".
 */
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius } from '@/constants/typography';

interface TimeFieldProps {
  label: string;
  /** "HH:mm" */
  value: string;
  onChange: (value: string) => void;
}

const pad = (n: number): string => n.toString().padStart(2, '0');

export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const [hStr, mStr] = value.split(':');
  const hour = Number(hStr) || 0;
  const minute = Number(mStr) || 0;

  const update = useCallback(
    (h: number, m: number) => {
      const nextH = ((h % 24) + 24) % 24;
      const nextM = ((m % 60) + 60) % 60;
      onChange(`${pad(nextH)}:${pad(nextM)}`);
    },
    [onChange],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Stepper
          accessibilityLabel={`${label} 시`}
          value={pad(hour)}
          onUp={() => update(hour + 1, minute)}
          onDown={() => update(hour - 1, minute)}
        />
        <Text style={styles.colon}>:</Text>
        <Stepper
          accessibilityLabel={`${label} 분`}
          value={pad(minute)}
          onUp={() => update(hour, minute + 5)}
          onDown={() => update(hour, minute - 5)}
        />
      </View>
    </View>
  );
}

interface StepperProps {
  value: string;
  accessibilityLabel: string;
  onUp: () => void;
  onDown: () => void;
}

function Stepper({ value, accessibilityLabel, onUp, onDown }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} 증가`}
        onPress={onUp}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
      >
        <Text style={styles.stepBtnText}>▲</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} 감소`}
        onPress={onDown}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
      >
        <Text style={styles.stepBtnText}>▼</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colon: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    color: colors.text3,
  },
  stepper: {
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.5,
  },
  stepBtnText: {
    fontSize: fontSize.md,
    color: colors.accent,
  },
  stepValue: {
    fontSize: 32,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    minWidth: 56,
    textAlign: 'center',
  },
});
