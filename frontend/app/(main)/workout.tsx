import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { useWorkoutStore } from '@/store/workoutStore';

const MUSCLE_GROUP_LABEL: Record<string, string> = {
  chest: '가슴',
  back: '등',
  shoulder: '어깨',
  arm: '팔',
  leg: '하체',
  core: '코어',
  cardio: '유산소',
};

export default function WorkoutScreen() {
  const router = useRouter();
  const { plans, sessions, plansLoading, sessionsLoading, fetchPlans, fetchSessions } =
    useWorkoutStore();

  useEffect(() => {
    fetchPlans();
    fetchSessions();
  }, []);

  const loading = plansLoading || sessionsLoading;

  // 오늘 요일 (백엔드: 0=월 ~ 6=일, JS Date: 0=일 ~ 6=토)
  const todayDow = new Date().getDay();
  const backendDow = todayDow === 0 ? 6 : todayDow - 1;
  const todayPlan = plans.find((p) => p.day_of_week === backendDow);

  // 이번 주 완료 세션 수 (최근 7일)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekCount = sessions.filter(
    (s) => s.status === 'completed' && new Date(s.started_at).getTime() > weekAgo,
  ).length;

  const totalVolume = sessions
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + (s.total_volume_kg ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerLabel}>오늘의 운동</Text>
          <Text style={styles.headerTitle}>
            {todayPlan
              ? todayPlan.is_rest_day
                ? '오늘은 휴식일이에요 😴'
                : (todayPlan.name ?? '운동 플랜')
              : '플랜을 아직 설정하지 않았어요'}
          </Text>
          <Text style={styles.headerSub}>
            {todayPlan && !todayPlan.is_rest_day
              ? `${todayPlan.plan_exercises.length}가지 운동`
              : '운동 탭에서 플랜을 만들어보세요'}
          </Text>
        </View>

        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* 오늘의 플랜 */}
              {todayPlan && !todayPlan.is_rest_day && todayPlan.plan_exercises.length > 0 ? (
                <View>
                  <Text style={styles.sectionTitle}>오늘의 플랜</Text>
                  <View style={styles.planCard}>
                    {todayPlan.plan_exercises.map((pe, i) => (
                      <View
                        key={pe.id}
                        style={[
                          styles.exerciseRow,
                          i === todayPlan.plan_exercises.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View style={[styles.exerciseIcon, { backgroundColor: colors.softBlue }]}>
                          <Text>{pe.exercise.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.exerciseName}>{pe.exercise.name}</Text>
                          <Text style={styles.exerciseMeta}>
                            {pe.target_sets}세트
                            {pe.target_reps ? ` × ${pe.target_reps}회` : ''}
                            {pe.target_weight_kg ? ` · ${pe.target_weight_kg}kg` : ''}
                          </Text>
                        </View>
                        <View style={[styles.muscleBadge, { backgroundColor: colors.softGreen }]}>
                          <Text style={[styles.muscleBadgeText, { color: colors.green }]}>
                            {MUSCLE_GROUP_LABEL[pe.exercise.muscle_group] ?? pe.exercise.muscle_group}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    {todayPlan?.is_rest_day
                      ? '오늘은 몸을 쉬게 해주세요 💤'
                      : '아직 등록된 운동 플랜이 없어요.\n온보딩에서 플랜을 설정해보세요!'}
                  </Text>
                </View>
              )}

              {/* 최근 운동 요약 */}
              <View>
                <Text style={styles.sectionTitle}>최근 기록</Text>
                <View style={styles.summaryRow}>
                  {[
                    { label: '이번 주', val: `${weekCount}회` },
                    {
                      label: '총 볼륨',
                      val: totalVolume > 0
                        ? `${(totalVolume / 1000).toFixed(1)}t`
                        : '–',
                    },
                    { label: '총 세션', val: `${sessions.filter((s) => s.status === 'completed').length}회` },
                  ].map((item, i) => (
                    <View
                      key={i}
                      style={[
                        styles.summaryItem,
                        i < 2 && { borderRightWidth: 1, borderRightColor: colors.border },
                      ]}
                    >
                      <Text style={styles.summaryVal}>{item.val}</Text>
                      <Text style={styles.summaryLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* 운동 시작 버튼 */}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push('/(main)/pre-workout')}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>운동 전 체크하기 →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 20 },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLabel: { fontSize: fontSize.xs, color: colors.text3, marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: fontWeight.heavy, color: colors.text },
  headerSub: { fontSize: fontSize.xs, color: colors.text2, marginTop: 2 },
  body: { padding: spacing.md, gap: 11 },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 7,
  },
  planCard: { backgroundColor: colors.card, borderRadius: 15, padding: spacing.md },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  exerciseMeta: { fontSize: 10, color: colors.text3, marginTop: 1 },
  muscleBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  muscleBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: spacing.md,
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: { fontSize: fontSize.sm, color: colors.text3, textAlign: 'center', lineHeight: 20 },
  summaryRow: {
    backgroundColor: colors.card,
    borderRadius: 15,
    flexDirection: 'row',
    padding: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 16, fontWeight: fontWeight.heavy, color: colors.text },
  summaryLabel: { fontSize: 10, color: colors.text3, marginTop: 2 },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    padding: 13,
    alignItems: 'center',
  },
  startBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.heavy, color: '#fff' },
});
