import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    AppState,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";

// JS 렌더링 완료 전까지 native splash를 붙잡아서 파란 blob 플래시 방지
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

import { colors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { syncSleepData, syncDailyMetrics } from "@/services/health";
import { setPreCareMessage } from "@/services/careCache";
import "@/services/backgroundTasks";
import { registerHealthSyncTask } from "@/services/backgroundTasks";

const PRE_CARE_TYPES = new Set(["morning_care", "preworkout_care"]);

function handleCareNotification(
    body: string | undefined,
    data: Record<string, string> | undefined,
) {
    if (body && data?.type && PRE_CARE_TYPES.has(data.type))
        void setPreCareMessage(body);
}

let lastSleepSyncDate = "";
function maybeSyncSleep() {
    const today = new Date().toLocaleDateString("sv-SE");
    if (lastSleepSyncDate === today) return;
    lastSleepSyncDate = today;
    syncSleepData().catch(() => {});
}

function SplashLoading() {
    return (
        <View style={styles.splash}>
            <Text style={styles.brand}>
                <Text style={{ color: colors.accent }}>Re</Text>
                <Text style={{ color: colors.accentOrange }}>Fit</Text>
            </Text>
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
        </View>
    );
}

export default function RootLayout() {
    const router = useRouter();
    const status = useAuthStore((s) => s.status);
    const user = useAuthStore((s) => s.user);

    const [splashMounted, setSplashMounted] = useState(true);
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // JS splash가 완전히 마운트된 후 native splash 해제
        SplashScreen.hideAsync().catch(() => {});
    }, []);

    useEffect(() => {
        useAuthStore.getState().bootstrap();
    }, []);

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            router.replace("/(auth)/login");
        } else if (user?.is_onboarding_complete) {
            router.replace("/(main)");
        } else {
            router.replace("/(onboarding)/workout-routine");
        }

        // 화면 트랜지션(~350ms) 완료 후 페이드 아웃
        const t = setTimeout(() => {
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => setSplashMounted(false));
        }, 400);
        return () => clearTimeout(t);
    }, [status, router]);

    useEffect(() => {
        if (status !== "authenticated") return;
        maybeSyncSleep();
        registerHealthSyncTask();
    }, [status]);

    useEffect(() => {
        const sub = AppState.addEventListener("change", (nextState) => {
            if (
                nextState === "active" &&
                useAuthStore.getState().status === "authenticated"
            ) {
                maybeSyncSleep();
                syncDailyMetrics().catch(() => {});
            }
        });
        return () => sub.remove();
    }, []);

    useEffect(() => {
        const sub = Notifications.addNotificationReceivedListener(
            (notification) => {
                handleCareNotification(
                    notification.request.content.body ?? undefined,
                    notification.request.content.data as
                        | Record<string, string>
                        | undefined,
                );
            },
        );
        return () => sub.remove();
    }, []);

    useEffect(() => {
        const sub = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                handleCareNotification(
                    response.notification.request.content.body ?? undefined,
                    response.notification.request.content.data as
                        | Record<string, string>
                        | undefined,
                );
            },
        );
        return () => sub.remove();
    }, []);

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
            {splashMounted && (
                <Animated.View
                    style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}
                    pointerEvents="none"
                >
                    <SplashLoading />
                </Animated.View>
            )}
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    splash: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.white,
    },
    brand: {
        fontSize: 41,
        fontWeight: "900",
    },
    spinner: {
        marginTop: 24,
    },
});
