import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';

export interface MenuItem {
  icon: string;
  bg: string;
  name: string;
  meta?: string;
  onPress?: () => void;
}

interface MenuSectionProps {
  label: string;
  items: MenuItem[];
}

export function MenuSection({ label, items }: MenuSectionProps) {
  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.menuCard}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, i === items.length - 1 && { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={item.onPress}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
              <Text>{item.icon}</Text>
            </View>
            <Text style={styles.menuName}>{item.name}</Text>
            {item.meta ? <Text style={styles.menuMeta}>{item.meta}</Text> : null}
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 10,
    fontWeight: fontWeight.heavy,
    color: colors.text3,
    letterSpacing: 0.7,
    paddingHorizontal: 4,
    marginTop: 3,
    marginBottom: 5,
  },
  menuCard: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuName: { flex: 1, fontSize: 13, fontWeight: fontWeight.bold, color: colors.text },
  menuMeta: { fontSize: 10, color: colors.text3 },
  menuArrow: { fontSize: 14, color: colors.text3 },
});
