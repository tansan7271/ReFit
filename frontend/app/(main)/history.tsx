import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { useWorkoutStore } from '@/store/workoutStore';

function formatDuration(sec: number | null): string {
  if (!sec) return '–';
  const m = Math.floor(sec / 60);
  return `${m}분`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
}

export default function HistoryScreen() {
  const { sessions, sessionsLoading: loading, fetchSessions } = useWorkoutStore();

  useEffect(() => {
    fetchSessions();
  }, []);

  const completed = sessions.filter((s) => s.status === 'completed');

  const totalDurationHours =
    completed.reduce((sum, s) => sum + (s.total_duration_sec ?? 0), 0) / 3600;

  const thisMonth = new Date().getMonth();
  const thisMonthCount = completed.filter(
    (s) => new Date(s.started_at).getMonth() === thisMonth,
  ).length;

  const totalCalories = completed.reduce((sum, s) => sum + (s.calories_burned ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>운동 기록</Text>
          <Text style={styles.subtitle}>
            총 {completed.length}회 완료 · 이번 달 {thisMonthCount}회
          </Text>
        </View>

        <View style={styles.body}>
          {/* 월별 요약 */}
          <View style={styles.summaryCard}>
            {[
              { label: '이번 달', val: `${thisMonthCount}회` },
              { label: '총 시간', val: `${totalDurationHours.toFixed(1)}h` },
              { label: '총 칼로리', val: totalCalories > 0 ? totalCalories.toLocaleString() : '–' },
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

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
          ) : completed.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                아직 완료된 운동 기록이 없어요.{'\n'}첫 운동을 시작해봐요! 🏋️
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>최근 세션</Text>
              {completed.map((session) => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionDate}>{formatDate(session.started_at)}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>완료</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionName}>
                    {session.plan_id ? `플랜 #${session.plan_id}` : '자유 운동'}
                  </Text>
                  <View style={styles.sessionMeta}>
                    <Text style={styles.sessionMetaText}>
                      ⏱ {formatDuration(session.total_duration_sec)}
                    </Text>
                    {session.calories_burned != null && (
                      <Text style={styles.sessionMetaText}>
                        🔥 {session.calories_burned} kcal
                      </Text>
                    )}
                    {session.total_volume_kg != null && (
                      <Text style={styles.sessionMetaText}>
                        💪 {session.total_volume_kg.toFixed(0)} kg
                      </Text>
                    )}
                    <Text style={styles.sessionMetaText}>⭐ +{session.xp_earned} XP</Text>
                  </View>
                </View>
              ))}
            </>
          )}
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
  title: { fontSize: 20, fontWeight: fontWeight.heavy, color: colors.text },
  subtitle: { fontSize: fontSize.xs, color: colors.text3, marginTop: 2 },
  body: { padding: spacing.md, gap: 11 },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    flexDirection: 'row',
    padding: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 16, fontWeight: fontWeight.heavy, color: colors.text },
  summaryLabel: { fontSize: 10, color: colors.text3, marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 2,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: { fontSize: fontSize.sm, color: colors.text3, textAlign: 'center', lineHeight: 20 },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionDate: { fontSize: 10, color: colors.text3 },
  statusBadge: {
    backgroundColor: colors.softGreen,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusText: { fontSize: 9, color: colors.green, fontWeight: fontWeight.bold },
  sessionName: { fontSize: 15, fontWeight: fontWeight.heavy, color: colors.text },
  sessionMeta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  sessionMetaText: { fontSize: fontSize.xs, color: colors.text2 },
});
