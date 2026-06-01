import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { useLoopAnimation } from '@/hooks/useLoopAnimation';
import { AICard, AIItem } from '@/components/cards/AICard';
import { fetchPreWorkoutMessage, fetchSleepStats } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { SleepStats } from '@/types';

function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}h ${m}m`;
}

const AI_TIPS: AIItem[] = [
  { emoji: '😴', text: '어제 5시간밖에 못 잤어요. 오늘은 기록보단 폼 유지에 집중! 무게 10% 낮춰도 좋아요.' },
  { emoji: '🍌', text: '지금 바로 바나나 1개 또는 주먹밥으로 탄수화물 보충! 공복 하체는 너무 힘들어요.' },
  { emoji: '🧘', text: '고관절·햄스트링 스트레칭 10분 필수! 하체 부상 예방의 핵심이에요.' },
  { emoji: '💧', text: '지금 물 300ml 마셔두세요. 날씨 좋아도 하체는 땀이 많아요.' },
];

export default function PreWorkoutScreen() {
  const router = useRouter();
  const bounceAnim = useLoopAnimation(-9, 750);
  const user = useAuthStore((s) => s.user);
  const [sleepStats, setSleepStats] = useState<SleepStats | null>(null);
  const [aiItems, setAiItems] = useState<AIItem[]>([{ emoji: '🤖', text: 'AI 가이드 불러오는 중...' }]);

  useEffect(() => {
    let cancelled = false;
    fetchSleepStats(1)
      .then((s) => { if (!cancelled) setSleepStats(s); })
      .catch((e) => { console.warn('[pre-workout] sleep stats fetch failed', e); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPreWorkoutMessage()
      .then((res) => {
        if (!cancelled) setAiItems([{ emoji: '🤖', text: res.message }]);
      })
      .catch((e) => {
        console.warn('[pre-workout] AI guide fetch failed', e);
        if (!cancelled) setAiItems(AI_TIPS);
      });
    return () => { cancelled = true; };
  }, []);

  const sleepDurationMin = sleepStats?.avg_duration_minutes ?? 0;
  const sleepText = sleepStats ? formatSleep(sleepDurationMin) : '-';
  const sleepOk = sleepDurationMin >= 360; // 6시간 이상이면 ok
  const sleepBadge = !sleepStats ? '-' : sleepOk ? '양호' : '부족';

  const CONDITION = [
    { icon: '😴', label: '어젯밤 수면', val: sleepText, badge: sleepBadge, ok: sleepOk },
    { icon: '🚶', label: '오늘 걸음수', val: '-', badge: '미연동', ok: true },
    { icon: '❤️', label: '안정 심박', val: '-', badge: '미연동', ok: true },
    { icon: '☀️', label: '날씨', val: '-', badge: '-', ok: true },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <Animated.Text style={[styles.char, { transform: [{ translateY: bounceAnim }] }]}>
            {user?.character_emoji ?? '🐣'}
          </Animated.Text>
          <Text style={styles.title}>운동 1시간 전이에요!</Text>
          <Text style={styles.subtitle}>리핏메타몽이 오늘 컨디션 분석했어요</Text>
        </View>

        <View style={styles.body}>
          {/* 컨디션 카드 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>📊 오늘의 컨디션</Text>
              <Text style={styles.cardTitleSub}>(Apple Health 연동)</Text>
            </View>
            {CONDITION.map((item, i) => (
              <View
                key={i}
                style={[styles.condRow, i === CONDITION.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={styles.condIcon}>{item.icon}</Text>
                <Text style={styles.condLabel}>{item.label}</Text>
                <Text style={styles.condVal}>{item.val}</Text>
                <View
                  style={[
                    styles.condBadge,
                    { backgroundColor: item.ok ? colors.softGreen : colors.softAmber },
                  ]}
                >
                  <Text
                    style={[
                      styles.condBadgeText,
                      { color: item.ok ? colors.green : '#e65100' },
                    ]}
                  >
                    {item.badge}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* AI 케어 카드 */}
          <AICard title="AI 운동 전 케어" items={aiItems} />

          {/* 운동 시작 버튼 */}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push('/(main)/session')}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>🏋️ 운동 시작!</Text>
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
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  char: { fontSize: 52, marginBottom: 8 },
  title: {
    fontSize: 19,
    fontWeight: fontWeight.black,
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
  },
  subtitle: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  body: { padding: spacing.md, gap: 10 },
  card: { backgroundColor: colors.card, borderRadius: 15, padding: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  cardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.heavy, color: colors.text },
  cardTitleSub: { fontSize: 10, color: colors.text3 },
  condRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  condIcon: { fontSize: 16, width: 26, textAlign: 'center' },
  condLabel: { flex: 1, fontSize: fontSize.sm, color: colors.text2 },
  condVal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  condBadge: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  condBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    padding: 13,
    alignItems: 'center',
  },
  startBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.heavy, color: '#fff' },
});
