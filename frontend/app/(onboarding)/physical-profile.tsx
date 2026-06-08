import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { SkillLevel } from '@/types';

const TOTAL_STEPS = 5;

const SKILL_LEVELS: { key: SkillLevel; emoji: string; name: string; desc: string }[] = [
  { key: 'beginner', emoji: '🌱', name: '초보자', desc: '운동을 처음 시작하는 단계예요' },
  { key: 'novice', emoji: '🔰', name: '입문자', desc: '기본 동작을 익히고 있는 단계예요' },
  { key: 'intermediate', emoji: '💪', name: '중급자', desc: '꾸준히 운동해온 경험이 있어요' },
  { key: 'advanced', emoji: '🏆', name: '상급자', desc: '고강도 훈련에 익숙한 수준이에요' },
];

function StepDots({ current }: { current: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <View key={i} style={[dotStyles.dot, i === current - 1 ? dotStyles.active : dotStyles.inactive]} />
      ))}
    </View>
  );
}
const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  active: { width: 20, backgroundColor: colors.accent },
  inactive: { width: 6, backgroundColor: colors.border },
});

export default function PhysicalProfile() {
  const router = useRouter();
  const { physicalProfile, setPhysicalProfile, setSkillLevel } = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  const [height, setHeight] = useState(
    physicalProfile.heightCm ? String(physicalProfile.heightCm) : '',
  );
  const [weight, setWeight] = useState(
    physicalProfile.weightKg ? String(physicalProfile.weightKg) : '',
  );
  const [skill, setSkill] = useState<SkillLevel | null>(physicalProfile.skillLevel);

  const validate = (): string | null => {
    if (!skill) return '숙련도를 선택해주세요.';
    if (height.trim()) {
      const h = parseFloat(height);
      if (isNaN(h) || h < 100 || h > 250) return '키는 100~250cm 사이로 입력해주세요.';
    }
    if (weight.trim()) {
      const w = parseFloat(weight);
      if (isNaN(w) || w < 30 || w > 300) return '몸무게는 30~300kg 사이로 입력해주세요.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setPhysicalProfile({
      heightCm: height.trim() ? parseFloat(height) : null,
      weightKg: weight.trim() ? parseFloat(weight) : null,
    });
    if (skill) setSkillLevel(skill);
    router.push('/(onboarding)/health-connect');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.root}>
          <View style={styles.header}>
            <StepDots current={3} />
            <Text style={styles.title}>신체 정보 입력</Text>
            <Text style={styles.subtitle}>맞춤형 분석을 위해 필요해요</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.fields}>
              <TextInput
                style={styles.input}
                placeholder="키 (cm)"
                placeholderTextColor={colors.text3}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                accessibilityLabel="키 입력"
              />
              <TextInput
                style={styles.input}
                placeholder="몸무게 (kg)"
                placeholderTextColor={colors.text3}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                accessibilityLabel="몸무게 입력"
              />
            </View>

            <Text style={styles.sectionLabel}>숙련도 <Text style={styles.required}>*</Text></Text>
            <View style={styles.skillList}>
              {SKILL_LEVELS.map((level) => {
                const selected = skill === level.key;
                return (
                  <Pressable
                    key={level.key}
                    style={[styles.skillCard, selected && styles.skillCardSelected]}
                    onPress={() => { setSkill(level.key); setError(null); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={styles.skillEmoji}>{level.emoji}</Text>
                    <View style={styles.skillText}>
                      <Text style={[styles.skillName, selected && styles.skillNameSelected]}>
                        {level.name}
                      </Text>
                      <Text style={[styles.skillDesc, selected && styles.skillDescSelected]}>
                        {level.desc}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.bottomAction}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.bottomRow}>
              <Pressable style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={22} color={colors.text2} />
              </Pressable>
              <Pressable style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>다음</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  title: {
    fontSize: fontSize.largeTitle, fontWeight: '900', color: colors.text,
    letterSpacing: -0.5, marginTop: 16, marginBottom: 4,
  },
  subtitle: { fontSize: fontSize.subhead, color: colors.text2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  fields: { gap: 8 },
  input: {
    backgroundColor: colors.bg, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: fontSize.body, color: colors.text,
  },
  sectionLabel: {
    fontSize: fontSize.subhead, fontWeight: fontWeight.semibold,
    color: colors.text2, marginTop: 28, marginBottom: 12,
  },
  required: { color: colors.red },
  skillList: { gap: 8 },
  skillCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.bg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  skillCardSelected: { backgroundColor: colors.accent },
  skillEmoji: { fontSize: 28 },
  skillText: { flex: 1 },
  skillName: {
    fontSize: fontSize.headline, fontWeight: fontWeight.semibold, color: colors.text,
  },
  skillNameSelected: { color: colors.white },
  skillDesc: { fontSize: fontSize.subhead, color: colors.text3, marginTop: 2 },
  skillDescSelected: { color: 'rgba(255,255,255,0.75)' },
  bottomAction: {
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8,
    backgroundColor: colors.white,
  },
  errorText: {
    color: colors.red, fontSize: fontSize.subhead,
    textAlign: 'center', marginBottom: 8,
  },
  bottomRow: { flexDirection: 'row', gap: 10 },
  backBtn: {
    width: 52, borderRadius: 12, backgroundColor: colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  button: {
    flex: 1, backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonText: {
    color: colors.white, fontSize: fontSize.headline,
    fontWeight: fontWeight.semibold,
  },
});
