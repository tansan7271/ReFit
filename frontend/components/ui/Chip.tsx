/**
 * 선택형 칩 — 부위/훈련방식 멀티 선택에 사용.
 * 프로토타입 .mchip 패턴.
 */
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius } from '@/constants/typography';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 선택 시 강조색 (기본 green) */
  accentColor?: string;
}

export function Chip({
  label,
  selected,
  onPress,
  accentColor = colors.green,
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        selected && {
          backgroundColor: colors.softGreen,
          borderColor: accentColor,
        },
      ]}
    >
      <Text
        style={[styles.label, selected && { color: accentColor, fontWeight: fontWeight.bold }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    color: colors.text2,
  },
});
