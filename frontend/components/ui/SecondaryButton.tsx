/**
 * 보조 버튼 — 프로토타입 .btn-skip 재현 (이전/건너뛰기).
 */
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius } from '@/constants/typography';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
}

export function SecondaryButton({ label, onPress }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.text2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
