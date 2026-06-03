import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { SelectCard } from '@/components/ui/SelectCard';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius } from '@/constants/typography';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { Gender } from '@/types';

const GENDER_OPTIONS: { value: Gender; emoji: string; title: string }[] = [
  { value: 'male', emoji: '👨', title: '남성' },
  { value: 'female', emoji: '👩', title: '여성' },
  { value: 'other', emoji: '🧑', title: '선택 안 함' },
];

function parseAge(text: string): number | null {
  const cleaned = text.replace(/[^0-9]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function PersonalInfoScreen() {
  const router = useRouter();
  const storedAge = useOnboardingStore((s) => s.age);
  const storedGender = useOnboardingStore((s) => s.gender);
  const setPersonalInfo = useOnboardingStore((s) => s.setPersonalInfo);

  const [age, setAge] = useState<number | null>(storedAge);
  const [gender, setGender] = useState<Gender | null>(storedGender);

  const nextEnabled = age !== null && gender !== null;

  const handleNext = () => {
    if (age === null || gender === null) return;
    setPersonalInfo(age, gender);
    router.push('/(onboarding)/health-connect');
  };

  return (
    <OnboardingScreen
      step="personal-info"
      title="인적사항을 알려주세요"
      subtitle="맞춤 운동·회복 추천에 사용돼요"
      nextEnabled={nextEnabled}
      onNext={handleNext}
      onBack={() => router.back()}
    >
      <View style={styles.field}>
        <Text style={styles.inputLabel}>나이</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="28"
          placeholderTextColor={colors.text3}
          value={age?.toString() ?? ''}
          onChangeText={(t) => setAge(parseAge(t))}
          accessibilityLabel="나이 입력"
          maxLength={3}
        />
      </View>

      <Text style={styles.sectionTitle}>성별</Text>
      {GENDER_OPTIONS.map((opt) => (
        <SelectCard
          key={opt.value}
          emoji={opt.emoji}
          title={opt.title}
          description=""
          selected={gender === opt.value}
          onPress={() => setGender(opt.value)}
        />
      ))}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginTop: 4,
  },
});
