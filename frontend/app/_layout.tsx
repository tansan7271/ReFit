/**
 * 루트 레이아웃.
 * 앱 부팅 시 인증 상태를 복원(bootstrap)하고 Stack 만 렌더한다.
 * 인증 상태에 따른 라우팅 분기는 app/index.tsx 의 <Redirect> 가 담당한다.
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/authStore';

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  // 앱 시작 시 1회 — 저장된 토큰으로 세션 복원
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(main)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
