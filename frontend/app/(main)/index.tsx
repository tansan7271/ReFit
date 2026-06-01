import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { useLoopAnimation } from '@/hooks/useLoopAnimation';
import { fetchSleepStats } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkoutStore } from '@/store/workoutStore';
import type { SleepStats } from '@/types';

type CharStatus = 'workout_done' | 'sleep_low' | 'normal';

const SLEEP_LOW_THRESHOLD = 360;
const FALLBACK_CHIPS = ['🍌 탄수 보충', '🧘 스트레칭', '💧 수분'];

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export default function HomeScreen() {
  const router = useRouter();
  const floatAnim = useLoopAnimation(-7, 1500);
  const user = useAuthStore((s) => s.user);
  const sessions = useWorkoutStore((s) => s.sessions);
  const fetchSessions = useWorkoutStore((s) => s.fetchSessions);

  const [sleepStats, setSleepStats] = useState<SleepStats | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    let active = true;
    fetchSleepStats(1)
      .then((stats) => {
        if (active) setSleepStats(stats);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const todayStr = new Date().toDateString();
  const hasWorkoutToday = sessions.some(
    (s) =>
      s.status === 'completed' &&
      new Date(s.started_at).toDateString() === todayStr,
  );

  const hasSleepData = sleepStats !== null && sleepStats.total_records > 0;
  const sleepLow = hasSleepData && sleepStats.avg_duration_minutes < SLEEP_LOW_THRESHOLD;

  const charStatus: CharStatus = hasWorkoutToday
    ? 'workout_done'
    : sleepLow
      ? 'sleep_low'
      : 'normal';

  const bannerChips = !hasSleepData
    ? FALLBACK_CHIPS
    : sleepLow
      ? ['😴 수면 부족 주의', '🍌 탄수 보충', '💧 수분 보충']
      : ['🧘 스트레칭', '💧 수분 보충', '⚡ 컨디션 양호'];

  const bannerMsg = sleepLow
    ? '어제 수면이 부족했어요.\n오늘은 강도를 조금 낮춰봐요!'
    : '오늘 운동 전에\n컨디션을 체크해봐요!';

  const todayDow = new Date().getDay(); // 0=일 ~ 6=토
  // 백엔드 day_of_week: 0=월 ~ 6=일, JS: 0=일 ~ 6=토
  const backendDow = todayDow === 0 ? 6 : todayDow - 1;
  const todayLabel = DAY_LABELS[backendDow];

  const nickname = user?.nickname ?? '리핏';
  const charEmoji = user?.character_emoji ?? '🐣';
  const charLevel = user?.character_level ?? 1;
  const charXp = user?.character_xp ?? 0;
  const xpToNextLevel = 500;
  const xpPercent = Math.min((charXp % xpToNextLevel) / xpToNextLevel, 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.greeting}>안녕하세요 👋</Text>
          <Text style={styles.userName}>{nickname}과 함께</Text>
          <Text style={styles.dateWeather}>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}{' '}
            ({todayLabel})
          </Text>
        </View>

        <View style={styles.body}>
          {/* 케어 배너 */}
          <View style={styles.careBanner}>
            <View style={styles.bannerCharCol}>
              <Animated.Text
                style={[styles.bannerChar, { transform: [{ translateY: floatAnim }] }]}
              >
                {charEmoji}
              </Animated.Text>
              {charStatus === 'workout_done' && (
                <View style={[styles.statusBadge, { backgroundColor: colors.softGreen }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.green }]}>⭐ 운동 완료</Text>
                </View>
              )}
              {charStatus === 'sleep_low' && (
                <View style={[styles.statusBadge, { backgroundColor: colors.softAmber }]}>
                  <Text style={[styles.statusBadgeText, { color: '#e65100' }]}>😴 수면 부족</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTag}>⚡ 운동 전 케어</Text>
              <Text style={styles.bannerMsg}>{bannerMsg}</Text>
              <View style={styles.bannerChips}>
                {bannerChips.map((chip) => (
                  <View key={chip} style={styles.bannerChip}>
                    <Text style={styles.bannerChipText}>{chip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* 오늘의 플랜 */}
          <View>
            <Text style={styles.sectionTitle}>오늘의 플랜</Text>
            <View style={styles.todayPlan}>
              <View style={styles.planRow}>
                <View style={[styles.planIcon, { backgroundColor: colors.softBlue }]}>
                  <Text>🏋️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>오늘 ({todayLabel}요일) 운동</Text>
                  <Text style={styles.planTime}>운동 탭에서 플랜을 확인하세요</Text>
                </View>
                <View style={[styles.planBadge, { backgroundColor: colors.softBlue }]}>
                  <Text style={[styles.planBadgeText, { color: colors.accent }]}>D-day</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 캐릭터 미니 카드 */}
          <View style={styles.charMiniCard}>
            <Animated.Text
              style={[styles.charMiniEmoji, { transform: [{ translateY: floatAnim }] }]}
            >
              {charEmoji}
            </Animated.Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.charMiniName}>{nickname} · Lv.{charLevel}</Text>
              <Text style={styles.charMiniStatus}>😊 오늘도 화이팅!</Text>
              <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${Math.round(xpPercent * 100)}%` }]} />
              </View>
            </View>
          </View>

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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: { fontSize: fontSize.sm, color: colors.text2, marginBottom: 2 },
  userName: { fontSize: 20, fontWeight: fontWeight.heavy, color: colors.text },
  dateWeather: { fontSize: fontSize.xs, color: colors.text3, marginTop: 2 },
  body: { padding: spacing.md, gap: 11 },
  careBanner: {
    backgroundColor: colors.accent,
    borderRadius: 17,
    padding: 13,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
  },
  bannerCharCol: { alignItems: 'center', gap: 4 },
  bannerChar: { fontSize: 26 },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 11, fontWeight: fontWeight.bold },
  bannerTag: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 3,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.6,
  },
  bannerMsg: {
    fontSize: fontSize.sm,
    color: '#fff',
    lineHeight: 18,
    fontWeight: fontWeight.regular,
  },
  bannerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 7 },
  bannerChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bannerChipText: { fontSize: 10, color: '#fff', fontWeight: fontWeight.bold },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 7,
  },
  todayPlan: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  planIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  planTime: { fontSize: 10, color: colors.text3 },
  planBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  planBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
  charMiniCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  charMiniEmoji: { fontSize: 42 },
  charMiniName: { fontSize: fontSize.md, fontWeight: fontWeight.heavy, color: colors.text },
  charMiniStatus: {
    fontSize: fontSize.xs,
    color: colors.accent2,
    fontWeight: fontWeight.regular,
    marginTop: 1,
  },
  xpBarBg: {
    marginTop: 5,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: 4,
    backgroundColor: colors.green,
    borderRadius: 4,
  },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    padding: 13,
    alignItems: 'center',
  },
  startBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.heavy, color: '#fff' },
});
