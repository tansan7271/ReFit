import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { fontSize } from '@/constants/typography';

export default function Community() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.text}>커뮤니티</Text>
        <Text style={styles.sub}>준비 중</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: fontSize.title1, color: colors.text },
  sub: { fontSize: fontSize.body, color: colors.text3, marginTop: 8 },
});
