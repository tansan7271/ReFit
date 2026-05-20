/**
 * 온보딩 화면 공통 스캐폴드.
 * 상단 진행 도트 + 제목/부제 + 스크롤 본문 + 하단 이전/다음 버튼.
 * 6개 온보딩 화면이 모두 이 컴포넌트로 레이아웃을 통일한다.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { StepDots } from './StepDots';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/store/onboardingStore';

interface OnboardingScreenProps {
  /** 현재 단계 키 — 진행 도트 위치 계산에 사용 */
  step: OnboardingStep;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** 다음 버튼 라벨 (기본: "다음 →") */
  nextLabel?: string;
  /** 다음 버튼 활성화 여부 */
  nextEnabled: boolean;
  /** 다음 버튼 로딩 상태 */
  nextLoading?: boolean;
  onNext: () => void;
  /** 이전 버튼 핸들러 — 없으면 첫 화면이므로 미표시 */
  onBack?: () => void;
}

export function OnboardingScreen({
  step,
  title,
  subtitle,
  children,
  nextLabel = '다음 →',
  nextEnabled,
  nextLoading = false,
  onNext,
  onBack,
}: OnboardingScreenProps) {
  const currentIndex = ONBOARDING_STEPS.indexOf(step);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <StepDots total={ONBOARDING_STEPS.length} current={currentIndex} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View style={styles.footer}>
        {onBack ? <SecondaryButton label="← 이전" onPress={onBack} /> : null}
        <PrimaryButton
          label={nextLabel}
          onPress={onNext}
          disabled={!nextEnabled}
          loading={nextLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgOnboarding,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 3,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.text2,
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});
