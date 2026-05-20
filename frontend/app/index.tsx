/**
 * 진입점 / 스플래시.
 * authStore.status 를 읽어 인증/온보딩 상태에 맞는 그룹으로 <Redirect> 분기한다.
 * - loading        → 스플래시 UI 표시 (_layout 의 bootstrap 완료 대기)
 * - unauthenticated → (auth)/login
 * - authenticated + 온보딩 미완료 → (onboarding)/workout-routine
 * - authenticated + 온보딩 완료   → (main)
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';

export default function SplashScreen() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  if (status === 'authenticated') {
    if (user && !user.is_onboarding_complete) {
      return <Redirect href="/(onboarding)/workout-routine" />;
    }
    return <Redirect href="/(main)" />;
  }

  // status === 'loading' — 부팅 중 스플래시 표시
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        RE<Text style={styles.logoAccent}>FIT</Text>
      </Text>
      <Text style={styles.tagline}>나만의 속도로, 오늘에 맞게.</Text>
      <ActivityIndicator
        color={colors.accent}
        style={styles.spinner}
        size="large"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgOnboarding,
  },
  logo: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.black,
    color: colors.accent,
    letterSpacing: 1.4,
  },
  logoAccent: {
    color: colors.accent2,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.text2,
    marginTop: 6,
  },
  spinner: {
    marginTop: 40,
  },
});
