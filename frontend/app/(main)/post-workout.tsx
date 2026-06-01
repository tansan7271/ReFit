import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { useLoopAnimation } from '@/hooks/useLoopAnimation';
import { AICard, AIItem } from '@/components/cards/AICard';
import { useAuthStore } from '@/store/authStore';
import { useWorkoutStore } from '@/store/workoutStore';

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
  const lastSession = useWorkoutStore((s) => s.lastSession);
  const user = useAuthStore((s) => s.user);

  const durationMin = lastSession?.total_duration_sec
    ? Math.round(lastSession.total_duration_sec / 60)
    : 0;
  const aiItems: AIItem[] = lastSession?.ai_feedback
    ? [{ emoji: '🤖', text: lastSession.ai_feedback }]
    : AFTERCARE;
  const report = [
    { label: '총 운동 시간', val: String(durationMin), unit: '분' },
    { label: '칼로리 소모', val: lastSession?.calories_burned ? String(lastSession.calories_burned) : '-', unit: 'kcal' },
    { label: '획득 XP', val: String(lastSession?.xp_earned ?? 0), unit: 'XP' },
    { label: '총 볼륨', val: lastSession?.total_volume_kg ? `${lastSession.total_volume_kg.toLocaleString()}` : '-', unit: 'kg' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Animated.Text style={[styles.char, { transform: [{ scale: scaleAnim }] }]}>
            {user?.character_emoji ?? '🐣'}
          </Animated.Text>
          <Text style={styles.charStar}>⭐</Text>
          <Text style={styles.title}>수고했어요! 🎉</Text>
          <Text style={styles.subtitle}>{user?.nickname ?? ''}님, 정말 대단해요! 🎉</Text>
        </View>

        <View style={styles.body}>
          {/* 리포트 카드 */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📋 오늘의 리포트</Text>
            <View style={styles.reportGrid}>
              {report.map((item, i) => (
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
          <AICard title="AI 운동 후 케어" items={aiItems} />

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
  homeBtn: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    padding: 13,
    alignItems: 'center',
  },
  homeBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.heavy, color: '#fff' },
});
