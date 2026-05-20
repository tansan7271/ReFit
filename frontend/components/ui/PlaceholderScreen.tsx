/**
 * 미구현 화면용 임시 플레이스홀더.
 * 인증/메인 탭은 이후 단계에서 실제 구현 예정 — 현재는 구조만 잡는다.
 */
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';

interface PlaceholderScreenProps {
  title: string;
  note?: string;
}

export function PlaceholderScreen({ title, note }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.heavy, color: colors.text },
  note: { fontSize: fontSize.sm, color: colors.text3 },
});
