import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius, spacing } from '@/constants/typography';
import { useLoopAnimation } from '@/hooks/useLoopAnimation';
import { completeWorkoutSession } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkoutStore } from '@/store/workoutStore';
import type { WorkoutPlan } from '@/types';

type SetEntry = {
  exercise_id: number;
  exercise_name: string;
  exercise_emoji: string;
  set_number: number;
  target_reps: number | null;
  target_weight_kg: number | null;
  actual_reps: string;
  actual_weight_kg: string;
  is_completed: boolean;
};

function buildSetEntries(plan: WorkoutPlan | undefined): SetEntry[] {
  if (!plan || plan.is_rest_day) return [];
  const entries: SetEntry[] = [];
  const exercises = [...plan.plan_exercises].sort((a, b) => a.order - b.order);
  for (const pe of exercises) {
    for (let i = 1; i <= pe.target_sets; i += 1) {
      entries.push({
        exercise_id: pe.exercise_id,
        exercise_name: pe.exercise.name,
        exercise_emoji: pe.exercise.emoji,
        set_number: i,
        target_reps: pe.target_reps,
        target_weight_kg: pe.target_weight_kg,
        actual_reps: String(pe.target_reps ?? ''),
        actual_weight_kg: String(pe.target_weight_kg ?? ''),
        is_completed: false,
      });
    }
  }
  return entries;
}

export default function SessionScreen() {
  const router = useRouter();
  const bounceAnim = useLoopAnimation(-12, 900);
  const user = useAuthStore((s) => s.user);
  const plans = useWorkoutStore((s) => s.plans);
  const fetchPlans = useWorkoutStore((s) => s.fetchPlans);
  const { startSession, currentSessionId, setCurrentSessionId } = useWorkoutStore();
  const [completing, setCompleting] = useState(false);
  const [setEntries, setSetEntries] = useState<SetEntry[]>([]);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (!currentSessionId && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      startSession();
    }
    fetchPlans();
  }, []);

  const todayDow = new Date().getDay();
  const backendDow = todayDow === 0 ? 6 : todayDow - 1;

  const todayPlan = useMemo(
    () => plans.find((p) => p.day_of_week === backendDow),
    [plans, backendDow],
  );

  useEffect(() => {
    setSetEntries(buildSetEntries(todayPlan));
  }, [todayPlan]);

  const charEmoji = user?.character_emoji ?? '🐣';
  const hasSets = setEntries.length > 0;

  const updateEntry = (index: number, patch: Partial<SetEntry>) => {
    setSetEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      if (currentSessionId) {
        const sets = setEntries.map((e) => ({
          exercise_id: e.exercise_id,
          set_number: e.set_number,
          reps: parseInt(e.actual_reps, 10) || null,
          weight_kg: parseFloat(e.actual_weight_kg) || null,
          is_completed: e.is_completed,
        }));
        const result = await completeWorkoutSession(currentSessionId, { sets });
        useWorkoutStore.getState().setLastSession(result);
        setCurrentSessionId(null);
        router.replace('/(main)/post-workout');
      } else {
        Alert.alert('세션 없음', '진행 중인 운동 세션이 없어요. 운동 탭에서 다시 시작해 주세요.');
      }
    } catch {
      Alert.alert(
        '기록 실패',
        '운동 기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setCompleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.statusLabel}>● 운동 중</Text>
        <Animated.Text style={[styles.char, { transform: [{ translateY: bounceAnim }] }]}>
          {charEmoji}
        </Animated.Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {hasSets ? (
          <>
            <Text style={styles.sectionTitle}>오늘의 운동</Text>
            {setEntries.map((entry, index) => (
              <View
                key={`${entry.exercise_id}-${entry.set_number}`}
                style={[styles.setCard, entry.is_completed && styles.setCardDone]}
              >
                <View style={styles.setCardTop}>
                  <Text style={styles.setName} numberOfLines={1}>
                    {entry.exercise_emoji} {entry.exercise_name}
                  </Text>
                  <Text style={styles.setNumber}>세트 {entry.set_number}</Text>
                </View>

                <View style={styles.setCardBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>횟수</Text>
                    <TextInput
                      style={styles.input}
                      value={entry.actual_reps}
                      onChangeText={(v) => updateEntry(index, { actual_reps: v })}
                      keyboardType="numeric"
                      placeholder={entry.target_reps != null ? String(entry.target_reps) : '-'}
                      placeholderTextColor={colors.text3}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>무게(kg)</Text>
                    <TextInput
                      style={styles.input}
                      value={entry.actual_weight_kg}
                      onChangeText={(v) => updateEntry(index, { actual_weight_kg: v })}
                      keyboardType="numeric"
                      placeholder={
                        entry.target_weight_kg != null ? String(entry.target_weight_kg) : '-'
                      }
                      placeholderTextColor={colors.text3}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.checkBtn, entry.is_completed && styles.checkBtnDone]}
                    onPress={() => updateEntry(index, { is_completed: !entry.is_completed })}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.exercise_name} 세트 ${entry.set_number} ${
                      entry.is_completed ? '완료 취소' : '완료'
                    }`}
                  >
                    <Text style={[styles.checkMark, entry.is_completed && styles.checkMarkDone]}>
                      ✓
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>오늘은 자유 운동이에요 💪</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.completeBtn, completing && { opacity: 0.6 }]}
          onPress={handleComplete}
          activeOpacity={0.85}
          disabled={completing}
          accessibilityRole="button"
        >
          <Text style={styles.completeBtnText}>
            {completing ? '기록 중...' : '운동 완료! 기록하기 →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  statusLabel: {
    fontSize: 10,
    color: colors.text2,
    letterSpacing: 1.2,
    fontWeight: fontWeight.bold,
  },
  char: { fontSize: 72 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  setCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  setCardDone: {
    backgroundColor: colors.softGreen,
    borderColor: colors.green,
  },
  setCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  setName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  setNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text2,
  },
  setCardBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  inputGroup: { flex: 1, gap: spacing.xs },
  inputLabel: {
    fontSize: fontSize.xs,
    color: colors.text2,
    fontWeight: fontWeight.regular,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  checkBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnDone: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkMark: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
    color: colors.text3,
  },
  checkMarkDone: { color: colors.white },
  emptyBox: {
    backgroundColor: colors.softBlue,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  completeBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  completeBtnText: { fontSize: 15, fontWeight: fontWeight.heavy, color: '#fff' },
});
