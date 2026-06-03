/**
 * 온보딩 6/6 — 캐릭터·목표 선택 + 온보딩 완료.
 * 캐릭터 이모지와 운동 목표를 선택한 뒤 "ReFit 시작하기" 를 누르면
 * 수집한 페이로드를 백엔드에 제출하고 메인 탭으로 진입한다.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { SelectCard } from '@/components/ui/SelectCard';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius } from '@/constants/typography';
import { getApiErrorMessage, submitOnboarding } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

const CHARACTER_EMOJIS = ['🐣', '🐥', '🐻', '🐯', '🦊', '🐼'];

const GOAL_OPTIONS: { value: string; emoji: string; title: string }[] = [
  { value: 'diet', emoji: '🔥', title: '체중 감량' },
  { value: 'muscle', emoji: '💪', title: '근육 증가' },
  { value: 'health', emoji: '🌿', title: '건강 유지' },
  { value: 'endurance', emoji: '⚡', title: '체력 향상' },
];

export default function CharacterIntroScreen() {
  const router = useRouter();
  const buildPayload = useOnboardingStore((s) => s.buildPayload);
  const setCharacterInfo = useOnboardingStore((s) => s.setCharacterInfo);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const setUser = useAuthStore((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);

  const [selectedEmoji, setSelectedEmoji] = useState('🐣');
  const [selectedGoal, setSelectedGoal] = useState('health');

  const canFinish = selectedEmoji !== '' && selectedGoal !== '';

  const handleFinish = async () => {
    if (!canFinish) return;
    setCharacterInfo(selectedEmoji, selectedGoal);
    setSubmitting(true);
    try {
      const base = buildPayload();
      const payload = { ...base, character_emoji: selectedEmoji, goal: selectedGoal };
      const updatedUser = await submitOnboarding(payload);

      // 백엔드는 갱신된 User 를 돌려준다고 가정한다.
      // 응답 형식이 미확정이라 방어적으로 검증: 유효한 User 가 없으면
      // setUser(null) 로 타입을 위반하지 않고 에러로 처리한다.
      if (!updatedUser) {
        throw new Error('온보딩 응답에 유저 정보가 없어요.');
      }

      setUser(updatedUser);
      resetOnboarding();
      router.replace('/(main)');
    } catch (error) {
      console.error('[character-intro] 온보딩 제출 실패', error);
      Alert.alert('온보딩 저장 실패', getApiErrorMessage(error), [
        { text: '다시 시도' },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingScreen
      step="character-intro"
      title="캐릭터를 골라주세요"
      subtitle="함께 운동할 ReFit 친구와 목표를 정해요"
      nextEnabled={canFinish && !submitting}
      nextLoading={submitting}
      nextLabel="ReFit 시작하기"
      onNext={handleFinish}
      onBack={submitting ? undefined : () => router.back()}
    >
      <View style={styles.charPreview}>
        <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
        <Text style={styles.previewName}>핏삐</Text>
      </View>

      <View style={styles.emojiGrid}>
        {CHARACTER_EMOJIS.map((emoji) => {
          const selected = selectedEmoji === emoji;
          return (
            <Pressable
              key={emoji}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`캐릭터 ${emoji}`}
              onPress={() => setSelectedEmoji(emoji)}
              style={[styles.emojiCell, selected && styles.emojiCellSelected]}
            >
              <Text style={styles.emojiCellText}>{emoji}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>운동 목표</Text>
      {GOAL_OPTIONS.map((opt) => (
        <SelectCard
          key={opt.value}
          emoji={opt.emoji}
          title={opt.title}
          description=""
          selected={selectedGoal === opt.value}
          onPress={() => setSelectedGoal(opt.value)}
        />
      ))}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  charPreview: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  previewEmoji: {
    fontSize: 72,
  },
  previewName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
    color: colors.accent,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  emojiCell: {
    width: '31%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  emojiCellSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.softGreen,
  },
  emojiCellText: {
    fontSize: 40,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginTop: 4,
  },
});
