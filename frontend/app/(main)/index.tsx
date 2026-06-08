import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/constants/colors";
import { fontSize, fontWeight } from "@/constants/typography";
import { TabBackground } from "@/components/TabBackground";
import {
    type ConditionSnapshot,
    fetchMe,
    fetchConditionSnapshot,
    fetchSleepStats,
} from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { SleepStats } from "@/types";

const XP_PER_LEVEL = 500;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayLabel() {
    const d = new Date();
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

function formatSleep(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function sleepFlavorText(actualMin: number, goalMin: number): string {
    const delta = actualMin - goalMin;
    if (delta <= -300)
        return "수면이 매우 부족해요, 오늘은 스스로를 살살 대해주세요.";
    if (delta <= -180)
        return "수면이 꽤 부족했네요, 오늘은 조심스럽게 보내봐요.";
    if (delta <= -60)
        return "어젯밤 수면이 조금 부족했어요, 틈틈이 쉬어가세요.";
    if (delta <= 30) return "수면 목표를 채웠어요! 오늘 하루도 화이팅.";
    return "충분히 잘 쉬었네요, 오늘도 활기차게 시작해봐요!";
}

export default function MainHome() {
    const user = useAuthStore((s) => s.user);
    const [snapshot, setSnapshot] = useState<ConditionSnapshot | null>(null);
    const [sleep, setSleep] = useState<SleepStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            let lat: number | undefined;
            let lon: number | undefined;
            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync();
                if (status === "granted") {
                    const pos = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    lat = pos.coords.latitude;
                    lon = pos.coords.longitude;
                }
            } catch {
                // 위치 권한 거부 또는 불가 → 날씨 없이 진행
            }

            const [freshUser, snap, ss] = await Promise.all([
                fetchMe().catch(() => null),
                fetchConditionSnapshot(lat, lon).catch(() => null),
                fetchSleepStats(1).catch(() => null),
            ]);
            if (freshUser) useAuthStore.getState().setUser(freshUser);
            setSnapshot(snap);
            setSleep(ss);
            setLoading(false);
        })();
    }, []);

    if (!user) return null;

    const insets = useSafeAreaInsets();
    const xpInLevel = user.character_xp % XP_PER_LEVEL;
    const xpPct = Math.min(xpInLevel / XP_PER_LEVEL, 1);

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            <TabBackground
                accentColor="rgba(26,92,204,0.40)"
                secondaryColor="rgba(73, 206, 255, 0.35)"
                fadeToColor={colors.bg}
            />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + 96 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* 헤더 */}
                <View style={styles.header}>
                    <Text style={styles.dateTitle}>{todayLabel()}</Text>
                    <Text style={styles.greeting}>
                        안녕하세요, {user.nickname}님
                    </Text>
                </View>

                {/* 캐릭터 카드 */}
                <BlurView intensity={70} tint="light" style={styles.card}>
                    <View style={styles.cardOverlay}>
                        <Text style={styles.cardLabel}>캐릭터</Text>
                        <View style={styles.characterPlaceholder} />
                        <View style={styles.characterMeta}>
                            <Text style={styles.levelText}>
                                Lv.{user.character_level}
                            </Text>
                            <View style={styles.xpTrack}>
                                <View
                                    style={[
                                        styles.xpFill,
                                        { width: `${xpPct * 100}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.xpText}>
                                {xpInLevel} / {XP_PER_LEVEL} XP
                            </Text>
                        </View>
                    </View>
                </BlurView>

                {/* 컨디션 스냅샷 카드 */}
                <BlurView intensity={70} tint="light" style={styles.card}>
                    <View style={styles.cardOverlay}>
                        <Text style={styles.cardLabel}>
                            오늘의 컨디션 리포트
                        </Text>
                        {loading ? (
                            <ActivityIndicator
                                color={colors.accent}
                                style={styles.loader}
                            />
                        ) : (
                            <View style={styles.snapshotRows}>
                                {snapshot?.weather_desc ? (
                                    <>
                                        <View style={styles.snapshotRow}>
                                            <View style={styles.iconWrap}>
                                                <Ionicons
                                                    name="partly-sunny-outline"
                                                    size={18}
                                                    color="#2E6FBF"
                                                />
                                            </View>
                                            <Text style={styles.snapshotValue}>
                                                {snapshot.weather_desc}
                                            </Text>
                                        </View>
                                        <View style={styles.divider} />
                                    </>
                                ) : null}
                                <View style={styles.snapshotRow}>
                                    <View style={styles.iconWrap}>
                                        <Ionicons
                                            name="moon-outline"
                                            size={18}
                                            color="#2E6FBF"
                                        />
                                    </View>
                                    {sleep && sleep.total_records > 0 ? (
                                        <View style={styles.sleepTextCol}>
                                            <Text style={styles.snapshotValue}>
                                                어젯밤 수면{" "}
                                                {formatSleep(
                                                    sleep.avg_duration_minutes,
                                                )}
                                            </Text>
                                            <Text style={styles.sleepFlavor}>
                                                {sleepFlavorText(
                                                    sleep.avg_duration_minutes,
                                                    user.sleep_goal_minutes ??
                                                        480,
                                                )}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.snapshotValue}>
                                            수면 데이터 없음
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                </BlurView>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
    },

    // 헤더
    header: {
        paddingTop: 40,
        paddingBottom: 24,
    },
    dateTitle: {
        fontSize: fontSize.largeTitle,
        lineHeight: 41,
        fontWeight: fontWeight.bold,
        color: "#132D5E",
        letterSpacing: -0.5,
    },
    greeting: {
        fontSize: fontSize.subhead,
        lineHeight: 20,
        color: "#4A6B90",
        marginTop: 4,
    },

    // 공통 카드
    card: {
        borderRadius: 16,
        marginBottom: 12,
        overflow: "hidden",
    },
    cardOverlay: {
        backgroundColor: "rgba(255,255,255,0.75)",
        padding: 16,
    },
    cardLabel: {
        fontSize: fontSize.footnote,
        fontWeight: fontWeight.semibold,
        color: "#4A6B90",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
    },

    // 캐릭터
    characterPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#D4E3F5",
        alignSelf: "center",
        marginBottom: 16,
    },
    characterMeta: {
        gap: 6,
    },
    levelText: {
        fontSize: fontSize.title2,
        fontWeight: fontWeight.bold,
        color: "#132D5E",
    },
    xpTrack: {
        height: 6,
        backgroundColor: "#D4E3F5",
        borderRadius: 3,
        overflow: "hidden",
    },
    xpFill: {
        height: "100%",
        backgroundColor: colors.accent,
        borderRadius: 3,
    },
    xpText: {
        fontSize: fontSize.caption,
        color: "#4A6B90",
    },

    // 컨디션 스냅샷
    loader: {
        marginVertical: 8,
    },
    snapshotRows: {
        gap: 12,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
    },
    snapshotRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingRight: 12,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "rgba(46,111,191,0.10)",
        alignItems: "center",
        justifyContent: "center",
    },
    snapshotValue: {
        flex: 1,
        fontSize: fontSize.body,
        color: "#132D5E",
    },
    sleepTextCol: {
        flex: 1,
    },
    sleepFlavor: {
        fontSize: 12,
        color: "#5A7AB5",
        marginTop: 3,
    },
});
