/**
 * 선택 카드 — 운동 유형/숙련도 선택 등에서 재사용.
 * 프로토타입 .level-card / .wt-card 패턴을 일반화.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius } from '@/constants/typography';

interface SelectCardProps {
  emoji: string;
  title: string;
  description: string;
  /** 선택 상태 */
  selected: boolean;
  onPress: () => void;
  /** 선택 시 강조색 (기본 accent) */
  accentColor?: string;
}

export function SelectCard({
  emoji,
  title,
  description,
  selected,
  onPress,
  accentColor = colors.accent,
}: SelectCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={[
        styles.card,
        selected && {
          borderColor: accentColor,
          backgroundColor: colors.softGreen,
        },
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Pressable>
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
  emoji: {
    fontSize: 26,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  description: {
    fontSize: fontSize.xs,
    color: colors.text2,
    lineHeight: 16,
  },
});
