/**
 * 온보딩 진행 도트 인디케이터
 * 프로토타입 .onb-step-dots 재현 — 완료/현재/예정 상태로 너비가 다르다.
 */
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

interface StepDotsProps {
  /** 전체 단계 수 */
  total: number;
  /** 현재 단계 (0-base) */
  current: number;
}

export function StepDots({ total, current }: StepDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const state =
          i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <View
            key={i}
            style={[
              styles.dot,
              state === 'done' && styles.done,
              state === 'active' && styles.active,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  dot: {
    height: 4,
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  done: {
    backgroundColor: colors.accent,
    width: 8,
  },
  active: {
    backgroundColor: colors.accent,
    width: 20,
  },
});
