/**
 * 온보딩 5/5 — 캐릭터 소개 + 온보딩 완료.
 * "ReFit 시작하기" 누르면 수집한 페이로드를 백엔드에 제출하고
 * 메인 탭으로 진입한다.
 */
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/components/ui/OnboardingScreen';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { getApiErrorMessage, submitOnboarding } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

export default function CharacterIntroScreen() {
  const router = useRouter();
  const buildPayload = useOnboardingStore((s) => s.buildPayload);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const setUser = useAuthStore((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload();
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
      title="준비 완료!"
      subtitle="이제 ReFit이 운동 전·후를 함께할게요"
      nextEnabled={!submitting}
      nextLoading={submitting}
      nextLabel="ReFit 시작하기"
      onNext={handleFinish}
      onBack={submitting ? undefined : () => router.back()}
    >
      <View style={styles.charBox}>
        <Text style={styles.emoji}>🐣</Text>
        <Text style={styles.charName}>핏삐</Text>
        <Text style={styles.charLine}>
          {'안녕! 나는 핏삐야.\n오늘 컨디션에 딱 맞는 운동 준비와\n회복을 같이 챙겨줄게.'}
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  charBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emoji: {
    fontSize: 88,
  },
  charName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
    color: colors.accent,
  },
  charLine: {
    fontSize: fontSize.base,
    color: colors.text2,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },
});
