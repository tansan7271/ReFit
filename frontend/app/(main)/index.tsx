import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
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
    PixelCharacter,
    PixelCharacterFromData,
    CELL_SIZE,
} from "@/components/PixelCharacter";
import {
    type ConditionSnapshot,
    type CharacterResponse,
    fetchMe,
    fetchConditionSnapshot,
    fetchSleepStats,
    fetchCharacter,
    fetchAllBadges,
    fetchMyBadges,
    checkBadges,
    equipBadge,
} from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useDebugStore } from "@/store/debugStore";
import type { Badge, SleepStats, UserBadge } from "@/types";

const XP_PER_LEVEL = 500;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const BADGE_ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
    "첫 운동": "star-outline",
    "운동 10회": "barbell-outline",
    "운동 30회": "flame-outline",
    "3일 연속": "calendar-outline",
    "7일 연속": "trophy-outline",
    "첫 수면 기록": "moon-outline",
    "7일 연속 수면": "ribbon-outline",
    "첫 친구": "people-outline",
    "첫 콕 찌르기": "hand-right-outline",
    "콕 찌르기 달인": "thumbs-up-outline",
};

function todayLabel() {
    const d = new Date();
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

function formatSleep(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function conditionSummary(
    sleepActual: number | null,
    sleepGoal: number,
    isOutdoorOk: boolean | null,
): string | null {
    const hasSleep = sleepActual !== null;
    const sleepBad = hasSleep && sleepActual! - sleepGoal <= -90;
    const sleepGood = hasSleep && sleepActual! - sleepGoal >= -30;

    if (hasSleep && isOutdoorOk !== null) {
        if (sleepBad && !isOutdoorOk)
            return "수면도 부족하고 운동하기 좋은 날도 아니에요.";
        if (sleepBad && isOutdoorOk)
            return "날씨는 좋지만 수면이 많이 부족해요.";
        if (sleepGood && !isOutdoorOk)
            return "실내 운동하기 좋은 컨디션이에요.";
        if (sleepGood && isOutdoorOk) return "야외 운동하기 딱 좋은 날이에요.";
        return isOutdoorOk
            ? "야외 운동하기 좋은 날이에요!"
            : "오늘은 실내 운동을 추천해요.";
    }
    if (isOutdoorOk !== null)
        return isOutdoorOk
            ? "수면 데이터를 받아올 수 없어요."
            : "수면 데이터를 받아올 수 없어요.";
    if (hasSleep) {
        return "날씨 데이터를 받아올 수 없어요.";
    }
    return null;
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
    const { debugMode, charState, energyLevel, growthLevel } = useDebugStore();
    const [snapshot, setSnapshot] = useState<ConditionSnapshot | null>(null);
    const [sleep, setSleep] = useState<SleepStats | null>(null);
    const [characterData, setCharacterData] =
        useState<CharacterResponse | null>(null);
    const [allBadges, setAllBadges] = useState<Badge[]>([]);
    const [myBadges, setMyBadges] = useState<UserBadge[]>([]);
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

            const [freshUser, snap, ss, char, all] = await Promise.all([
                fetchMe().catch(() => null),
                fetchConditionSnapshot(lat, lon).catch(() => null),
                fetchSleepStats(1).catch(() => null),
                fetchCharacter().catch(() => null),
                fetchAllBadges().catch(() => []),
            ]);

            // 배지 달성 조건 체크 → 새로 얻은 배지가 있으면 XP·목록 갱신
            const badgeResult = await checkBadges().catch(() => null);
            if (badgeResult && badgeResult.earned_count > 0) {
                const updated = await fetchMe().catch(() => null);
                if (updated) useAuthStore.getState().setUser(updated);
            }
            const mine = await fetchMyBadges().catch(() => []);
            if (freshUser) useAuthStore.getState().setUser(freshUser);
            setSnapshot(snap);
            setSleep(ss);
            setCharacterData(char);
            setAllBadges(all);
            setMyBadges(mine);
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
                        <View style={styles.characterWrap}>
                            {loading ? (
                                <ActivityIndicator color={colors.accent} />
                            ) : debugMode ? (
                                <PixelCharacter
                                    state={charState}
                                    options={{ energyLevel, growthLevel }}
                                    cellSize={CELL_SIZE.card}
                                />
                            ) : (
                                <PixelCharacterFromData
                                    data={characterData}
                                    cellSize={CELL_SIZE.card}
                                />
                            )}
                        </View>
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
                                {snapshot?.weather_main ? (
                                    <>
                                        <View style={styles.snapshotRow}>
                                            <View style={styles.iconWrap}>
                                                <Ionicons
                                                    name="partly-sunny-outline"
                                                    size={18}
                                                    color="#2E6FBF"
                                                />
                                            </View>
                                            <View style={styles.sleepTextCol}>
                                                <Text
                                                    style={styles.snapshotValue}
                                                >
                                                    {snapshot.weather_main}
                                                </Text>
                                                {snapshot.weather_sub ? (
                                                    <Text
                                                        style={
                                                            styles.sleepFlavor
                                                        }
                                                    >
                                                        {snapshot.weather_sub}
                                                    </Text>
                                                ) : null}
                                            </View>
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
                                {(() => {
                                    const summary = conditionSummary(
                                        sleep && sleep.total_records > 0
                                            ? sleep.avg_duration_minutes
                                            : null,
                                        user.sleep_goal_minutes ?? 480,
                                        snapshot?.is_outdoor_ok ?? null,
                                    );
                                    return summary ? (
                                        <>
                                            <View style={styles.divider} />
                                            <View style={styles.snapshotRow}>
                                                <View style={styles.iconWrap}>
                                                    <Ionicons
                                                        name="pulse-outline"
                                                        size={18}
                                                        color="#2E6FBF"
                                                    />
                                                </View>
                                                <Text
                                                    style={
                                                        styles.conditionSummary
                                                    }
                                                >
                                                    {summary}
                                                </Text>
                                            </View>
                                        </>
                                    ) : null;
                                })()}
                            </View>
                        )}
                    </View>
                </BlurView>
                {/* 배지 카드 */}
                <BlurView intensity={70} tint="light" style={styles.card}>
                    <View style={styles.cardOverlay}>
                        <View style={styles.badgeHeader}>
                            <Text style={[styles.cardLabel, { marginBottom: 0 }]}>배지</Text>
                            {!loading && allBadges.length > 0 && (
                                <Text style={styles.badgeCount}>
                                    {myBadges.length} / {allBadges.length}개 획득
                                </Text>
                            )}
                        </View>
                        {loading ? (
                            <ActivityIndicator
                                color={colors.accent}
                                style={styles.loader}
                            />
                        ) : (
                            <View style={styles.badgeGrid}>
                                {allBadges.map((badge) => {
                                    const userBadge = myBadges.find(
                                        (ub) => ub.badge.id === badge.id,
                                    );
                                    const earned = !!userBadge;
                                    const isEquipped = !!userBadge?.is_equipped;
                                    const inner = (
                                        <View
                                            style={[
                                                styles.badgeBox,
                                                earned
                                                    ? styles.badgeEarned
                                                    : styles.badgeLocked,
                                                isEquipped &&
                                                    styles.badgeEquipped,
                                            ]}
                                        >
                                            <Ionicons
                                                name={BADGE_ICON[badge.name] ?? "medal-outline"}
                                                size={24}
                                                color={earned ? colors.accent : "#C7C7CC"}
                                            />
                                            <Text
                                                style={[
                                                    styles.badgeName,
                                                    !earned &&
                                                        styles.badgeNameLocked,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {badge.name}
                                            </Text>
                                        </View>
                                    );
                                    return (
                                        <View
                                            key={badge.id}
                                            style={styles.badgeCell}
                                        >
                                            {earned ? (
                                                <Pressable
                                                    onPress={async () => {
                                                        try {
                                                            await equipBadge(badge.id);
                                                            setMyBadges((prev) =>
                                                                prev.map((ub) => ({
                                                                    ...ub,
                                                                    is_equipped: ub.badge.id === badge.id,
                                                                })),
                                                            );
                                                            Alert.alert(
                                                                "배지 변경",
                                                                `내 배지를 ${badge.name}(으)로 변경했습니다`,
                                                            );
                                                        } catch {
                                                            Alert.alert("오류", "배지 변경에 실패했어요");
                                                        }
                                                    }}
                                                >
                                                    {inner}
                                                </Pressable>
                                            ) : (
                                                inner
                                            )}
                                        </View>
                                    );
                                })}
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
    characterWrap: {
        alignItems: "center",
    },
    characterMeta: {
        gap: 6,
        marginTop: -24,
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
    conditionSummary: {
        flex: 1,
        fontSize: fontSize.body,
        color: "#132D5E",
        lineHeight: 22,
        fontWeight: fontWeight.medium,
    },

    // 배지
    badgeHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    badgeCount: {
        fontSize: fontSize.footnote,
        color: "#4A6B90",
    },
    badgeGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    badgeCell: {
        width: "25%",
        padding: 4,
    },
    badgeBox: {
        alignItems: "center",
        borderRadius: 12,
        paddingVertical: 10,
        gap: 6,
    },
    badgeEarned: {
        backgroundColor: "rgba(26,92,204,0.08)",
    },
    badgeEquipped: {
        borderWidth: 1.5,
        borderColor: "rgba(26,92,204,0.25)",
    },
    badgeLocked: {
        backgroundColor: "rgba(142,142,147,0.07)",
    },
    badgeName: {
        fontSize: 10,
        color: "#132D5E",
        fontWeight: fontWeight.medium,
        textAlign: "center",
    },
    badgeNameLocked: {
        color: "#C7C7CC",
    },
});
