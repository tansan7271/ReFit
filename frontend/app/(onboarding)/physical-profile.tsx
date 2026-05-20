/**
 * 온보딩 3/5 — 신체 정보 (키, 몸무게, 숙련도).
 */
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { SelectCard } from '@/components/ui/SelectCard';
import { colors } from '@/constants/colors';
import { SKILL_LEVELS } from '@/constants/labels';
import { fontSize, fontWeight, radius } from '@/constants/typography';
import { useOnboardingStore } from '@/store/onboardingStore';

/** 문자열 입력을 양수로 파싱, 빈값/비정상이면 null */
function parsePositive(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function PhysicalProfileScreen() {
  const router = useRouter();
  const physicalProfile = useOnboardingStore((s) => s.physicalProfile);
  const setPhysicalProfile = useOnboardingStore((s) => s.setPhysicalProfile);
  const setSkillLevel = useOnboardingStore((s) => s.setSkillLevel);

  const { heightCm, weightKg, skillLevel } = physicalProfile;

  // 키/몸무게/숙련도 모두 입력되어야 다음 진행 가능
  const nextEnabled =
    heightCm !== null && weightKg !== null && skillLevel !== null;

  return (
    <OnboardingScreen
      step="physical-profile"
      title="신체 정보를 알려주세요"
      subtitle="운동 강도와 칼로리 추천에 사용돼요"
      nextEnabled={nextEnabled}
      onNext={() => router.push('/(onboarding)/health-connect')}
      onBack={() => router.back()}
    >
      <View style={styles.inputRow}>
        <View style={styles.inputCol}>
          <Text style={styles.inputLabel}>키 (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="170"
            placeholderTextColor={colors.text3}
            defaultValue={heightCm?.toString() ?? ''}
            onChangeText={(t) =>
              setPhysicalProfile({ heightCm: parsePositive(t) })
            }
            accessibilityLabel="키 입력 (센티미터)"
            maxLength={3}
          />
        </View>
        <View style={styles.inputCol}>
          <Text style={styles.inputLabel}>몸무게 (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="65"
            placeholderTextColor={colors.text3}
            defaultValue={weightKg?.toString() ?? ''}
            onChangeText={(t) =>
              setPhysicalProfile({ weightKg: parsePositive(t) })
            }
            accessibilityLabel="몸무게 입력 (킬로그램)"
            maxLength={5}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>운동 숙련도</Text>
      {SKILL_LEVELS.map((lv) => (
        <SelectCard
          key={lv.level}
          emoji={lv.emoji}
          title={lv.title}
          description={lv.description}
          selected={skillLevel === lv.level}
          onPress={() => setSkillLevel(lv.level)}
        />
      ))}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
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
