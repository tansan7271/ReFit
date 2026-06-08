import { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';
import { syncSleepData, syncDailyMetrics } from '@/services/health';
import { setPreCareMessage } from '@/services/careCache';
import '@/services/backgroundTasks'; // defineTask 모듈 최상위 등록
import { registerHealthSyncTask } from '@/services/backgroundTasks';

// FCM data.type 값 중 운동 전 케어에 해당하는 것
const PRE_CARE_TYPES = new Set(['morning_care', 'preworkout_care']);

function handleCareNotification(body: string | undefined, data: Record<string, string> | undefined) {
  if (body && data?.type && PRE_CARE_TYPES.has(data.type)) {
    setPreCareMessage(body);
  }
}

// 앱 세션 내 중복 호출 방지 — 하루 1회만 sync
let lastSleepSyncDate = '';
function maybeSyncSleep() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastSleepSyncDate === today) return;
  lastSleepSyncDate = today;
  syncSleepData().catch(() => {});
}

function SplashLoading() {
  return (
    <View style={styles.splash}>
      <Text style={styles.brand}>ReFit</Text>
      <ActivityIndicator color={colors.accent} style={styles.spinner} />
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    useAuthStore.getState().bootstrap();
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/(auth)/login');
      return;
    }

    if (user?.is_onboarding_complete) {
      router.replace('/(main)');
    } else {
      router.replace('/(onboarding)/workout-routine');
    }
  }, [status, router]);

  // 인증 완료 시 최초 수면 sync + 백그라운드 태스크 등록
  useEffect(() => {
    if (status !== 'authenticated') return;
    maybeSyncSleep();
    registerHealthSyncTask();
  }, [status]);

  // 포어그라운드 복귀 시 수면 sync (하루 1회 제한) + 헬스 지표 sync
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && useAuthStore.getState().status === 'authenticated') {
        maybeSyncSleep();
        syncDailyMetrics().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  // 포그라운드 알림 수신 → 케어 메시지 캐시
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      handleCareNotification(
        notification.request.content.body ?? undefined,
        notification.request.content.data as Record<string, string> | undefined,
      );
    });
    return () => sub.remove();
  }, []);

  // 백그라운드 알림 탭 → 케어 메시지 캐시
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleCareNotification(
        response.notification.request.content.body ?? undefined,
        response.notification.request.content.data as Record<string, string> | undefined,
      );
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {status === 'loading' ? (
        <SplashLoading />
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  brand: {
    fontSize: fontSize.largeTitle,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  spinner: {
    marginTop: 24,
  },
});
