import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';

export interface AIItem {
  emoji: string;
  text: string;
}

interface AICardProps {
  title: string;
  items: AIItem[];
}

export function AICard({ title, items }: AICardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>🤖</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Gemini</Text>
        </View>
      </View>
      {items.map((item, i) => (
        <View
          key={i}
          style={[styles.row, i === items.length - 1 && { borderBottomWidth: 0 }]}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.text}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 15, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 9 },
  icon: { fontSize: 17 },
  title: { flex: 1, fontSize: 13, fontWeight: fontWeight.heavy, color: colors.text },
  badge: {
    backgroundColor: colors.softBlue,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: colors.accent, fontWeight: fontWeight.bold },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emoji: { fontSize: 18 },
  text: { flex: 1, fontSize: fontSize.sm, color: colors.text2, lineHeight: 18 },
});
