/**
 * 운동 루틴 편집 화면.
 * 요일별 운동 부위(WorkoutPlan.name 에 콤마 구분 BodyPart 로 저장)를 편집한다.
 * 부위가 비어 있는 요일의 플랜은 삭제한다.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  WEEKDAY_LABEL,
  WEEKDAY_ORDER,
} from '@/constants/labels';
import { fontSize, fontWeight, radius, spacing } from '@/constants/typography';
import {
  createWorkoutPlan,
  deleteWorkoutPlan,
  getApiErrorMessage,
  updateWorkoutPlan,
} from '@/services/api';
import { useWorkoutStore } from '@/store/workoutStore';
import type { BodyPart } from '@/types';

const VALID_BODY_PARTS: BodyPart[] = [
  'chest',
  'back',
  'shoulder',
  'arm',
  'leg',
  'core',
  'cardio',
];

/** 백엔드 day_of_week(0=월~6=일) → WEEKDAY_LABEL 키 매핑 */
function dayLabel(dow: number): string {
  return WEEKDAY_LABEL[WEEKDAY_ORDER[dow]];
}

export default function WorkoutRoutineEditScreen() {
  const router = useRouter();
  const { plans, fetchPlans } = useWorkoutStore();

  const [draft, setDraft] = useState<Map<number, BodyPart[]>>(new Map());
  const [activeDay, setActiveDay] = useState<number>(0); // 0=월 ~ 6=일
  const [saving, setSaving] = useState(false);
  const draftInitialized = useRef(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (draftInitialized.current) return;
    if (plans.length === 0 && !useWorkoutStore.getState().plansLoaded) return;
    draftInitialized.current = true;

    const map = new Map<number, BodyPart[]>();
    for (let i = 0; i < 7; i++) {
      const plan = plans.find((p) => p.day_of_week === i);
      const parts: BodyPart[] =
        plan && plan.name
          ? (plan.name
              .split(',')
              .filter((p) => VALID_BODY_PARTS.includes(p as BodyPart)) as BodyPart[])
          : [];
      map.set(i, parts);
    }
    setDraft(map);
  }, [plans]);

  useEffect(() => {
    const jsDay = new Date().getDay(); // 0=일 ~ 6=토
    setActiveDay(jsDay === 0 ? 6 : jsDay - 1);
  }, []);

  const togglePart = (part: BodyPart) => {
    setDraft((prev) => {
      const next = new Map(prev);
      const current = next.get(activeDay) ?? [];
      if (current.includes(part)) {
        next.set(
          activeDay,
          current.filter((p) => p !== part),
        );
      } else {
        next.set(activeDay, [...current, part]);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const calls: Promise<unknown>[] = [];
      for (let i = 0; i < 7; i++) {
        const existingPlan = plans.find((p) => p.day_of_week === i);
        const draftParts = draft.get(i) ?? [];

        if (draftParts.length === 0) {
          if (existingPlan) {
            calls.push(deleteWorkoutPlan(existingPlan.id));
          }
        } else {
          const newName = draftParts.join(',');
          if (!existingPlan) {
            calls.push(createWorkoutPlan(i, draftParts));
          } else if (existingPlan.name !== newName) {
            calls.push(updateWorkoutPlan(existingPlan.id, draftParts));
          }
        }
      }
      await Promise.all(calls);
      await fetchPlans(true);
      router.back();
    } catch (e) {
      Alert.alert('오류', getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const activeParts = draft.get(activeDay) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={() => router.back()}
          style={styles.headerSide}
          hitSlop={8}
        >
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>운동 루틴</Text>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="저장"
          onPress={handleSave}
          disabled={saving}
          style={[styles.headerSide, styles.headerSideRight]}
          hitSlop={8}
        >
          {saving ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Text style={styles.saveText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 요일 탭 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayRow}
        >
          {Array.from({ length: 7 }, (_, i) => i).map((dow) => {
            const active = dow === activeDay;
            const filled = (draft.get(dow) ?? []).length > 0;
            return (
              <TouchableOpacity
                key={dow}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${dayLabel(dow)}요일`}
                onPress={() => setActiveDay(dow)}
                style={[
                  styles.dayChip,
                  filled && styles.dayChipFilled,
                  active && styles.dayChipActive,
                ]}
              >
                <Text style={[styles.dayChipText, active && styles.dayChipTextOn]}>
                  {dayLabel(dow)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 선택 요일 운동 부위 */}
        <Text style={styles.sectionTitle}>{dayLabel(activeDay)}요일 운동 부위</Text>

        <View style={styles.chipWrap}>
          {BODY_PART_ORDER.map((part) => {
            const selected = activeParts.includes(part);
            return (
              <TouchableOpacity
                key={part}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={BODY_PART_LABEL[part]}
                onPress={() => togglePart(part)}
                style={[styles.partChip, selected && styles.partChipOn]}
              >
                <Text style={[styles.partChipText, selected && styles.partChipTextOn]}>
                  {BODY_PART_LABEL[part]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 현재 선택 요약 */}
        {activeParts.length === 0 ? (
          <Text style={styles.restText}>휴식일</Text>
        ) : (
          <Text style={styles.summaryText}>
            {activeParts.map((p) => BODY_PART_LABEL[p]).join(' · ')}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerSide: { minWidth: 56, justifyContent: 'center' },
  headerSideRight: { alignItems: 'flex-end' },
  backText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text2 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.heavy, color: colors.text },
  saveText: { fontSize: fontSize.base, fontWeight: fontWeight.heavy, color: colors.accent },
  scrollContent: { padding: spacing.lg, gap: spacing.md },
  dayRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipFilled: {
    borderColor: colors.green,
    backgroundColor: colors.softGreen,
  },
  dayChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  dayChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text2,
  },
  dayChipTextOn: { color: colors.white },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginTop: spacing.xs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  partChip: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  partChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  partChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text2,
  },
  partChipTextOn: { color: colors.white },
  restText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text3,
    marginTop: spacing.xs,
  },
  summaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
});
