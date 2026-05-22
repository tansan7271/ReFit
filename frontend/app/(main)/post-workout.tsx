import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { useLoopAnimation } from '@/hooks/useLoopAnimation';
import { AICard, AIItem } from '@/components/cards/AICard';

const REPORT = [
  { label: '총 운동 시간', val: '52', unit: '분' },
  { label: '칼로리 소모', val: '342', unit: 'kcal' },
  { label: '달성률', val: '100', unit: '%' },
  { label: '총 볼륨', val: '3,420', unit: 'kg' },
];

const AFTERCARE: AIItem[] = [
  { emoji: '🍬', text: '포도당 보충! 고강도 하체 후 혈당이 떨어졌어요. 포도당 캔디 하나 드세요.' },
  { emoji: '💧', text: '수분 500ml 필수! 전해질 음료도 OK. 근육 경련 예방에 중요해요.' },
  { emoji: '🦵', text: '폼롤러로 대퇴사두·햄스트링 5분! 내일 근육통이 달라져요.' },
  { emoji: '🛁', text: '다리가 부었을 텐데, 따뜻한 반신욕 38–40°C 20분 추천해요!' },
  { emoji: '🌙', text: '오늘 수면 부족했으니 오늘은 꼭 7시간 자야 해요. 근육 회복은 잠에서 완성돼요.' },
];

export default function PostWorkoutScreen() {
  const router = useRouter();
  const scaleAnim = useLoopAnimation(1.08, 750, 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Animated.Text style={[styles.char, { transform: [{ scale: scaleAnim }] }]}>
            🐣
          </Animated.Text>
          <Text style={styles.charStar}>⭐</Text>
          <Text style={styles.title}>수고했어요! 🎉</Text>
          <Text style={styles.subtitle}>리핏메타몽도 함께 땀 흘렸어요</Text>
        </View>

        <View style={styles.body}>
          {/* 리포트 카드 */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📋 오늘의 리포트</Text>
            <View style={styles.reportGrid}>
              {REPORT.map((item, i) => (
                <View key={i} style={styles.reportItem}>
                  <Text style={styles.reportLabel}>{item.label}</Text>
                  <Text style={styles.reportVal}>
                    {item.val}
                    <Text style={styles.reportUnit}>{item.unit}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* AI 운동 후 케어 카드 */}
          <AICard title="AI 운동 후 케어" items={AFTERCARE} />

          {/* 뱃지 획득 */}
          <View style={styles.badgeEarned}>
            <Text style={styles.badgeIcon}>🔥</Text>
            <View>
              <Text style={styles.badgeNew}>NEW BADGE</Text>
              <Text style={styles.badgeName}>불꽃 루틴러</Text>
              <Text style={styles.badgeDesc}>연속 3회 운동을 완료했어요</Text>
            </View>
          </View>

          {/* 홈으로 버튼 */}
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/(main)')}
            activeOpacity={0.85}
          >
            <Text style={styles.homeBtnText}>홈으로</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 24 },
  header: {
    backgroundColor: colors.accent2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  char: { fontSize: 58 },
  charStar: { fontSize: 22, marginTop: -18, marginLeft: 36 },
  title: { fontSize: 19, fontWeight: fontWeight.black, color: '#fff', marginTop: 5, marginBottom: 2 },
  subtitle: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)' },
  body: { padding: spacing.md, gap: 10 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 12 },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 8,
  },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  reportItem: {
    width: '47%',
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reportLabel: { fontSize: 10, color: colors.text3, fontWeight: fontWeight.regular, marginBottom: 1 },
  reportVal: { fontSize: 16, fontWeight: fontWeight.heavy, color: colors.text },
  reportUnit: { fontSize: 10, color: colors.text2 },
  badgeEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#fff8e8',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#f5d060',
  },
  badgeIcon: { fontSize: 28 },
  badgeNew: {
    fontSize: 10,
    color: colors.amber,
    fontWeight: fontWeight.heavy,
    letterSpacing: 0.7,
    marginBottom: 1,
  },
  badgeName: { fontSize: 13, fontWeight: fontWeight.heavy, color: colors.text },
  badgeDesc: { fontSize: fontSize.xs, color: colors.text2 },
  homeBtn: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    padding: 13,
    alignItems: 'center',
  },
  homeBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.heavy, color: '#fff' },
});
