import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Modal,
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

import { colors } from "@/constants/colors";
import { fontSize, fontWeight } from "@/constants/typography";
import { TabBackground } from "@/components/TabBackground";
import { useWorkoutStore } from "@/store/workoutStore";
import {
    startWorkoutSession,
    completeWorkoutSession,
    updateSessionParts,
    fetchPreCareMessage,
} from "@/services/api";
import { utcTimeToLocal } from "@/utils/time";
import { getPreCareMessage, setPreCareMessage, getPostCareMessage, setPostCareMessage } from "@/services/careCache";
import type { WorkoutPlan } from "@/types";

// 탭 바와 동일한 높이 기준 (main/_layout.tsx의 TAB_BAR_HEIGHT)
const TAB_BAR_HEIGHT = 64;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const ALL_BODY_PARTS: { key: string; label: string }[] = [
    { key: "chest", label: "가슴" },
    { key: "back", label: "등" },
    { key: "shoulder", label: "어깨" },
    { key: "arm", label: "팔" },
    { key: "leg", label: "하체" },
    { key: "core", label: "코어" },
    { key: "cardio", label: "유산소" },
];

const BODY_PART_KO: Record<string, string> = Object.fromEntries(
    ALL_BODY_PARTS.map(({ key, label }) => [key, label]),
);

function todayBackendDay() {
    return (new Date().getDay() + 6) % 7;
}

function getWeekStart() {
    const d = new Date();
    const jsDay = d.getDay();
    const diff = jsDay === 0 ? 6 : jsDay - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// 서버는 TZ=Asia/Seoul로 KST naive datetime을 저장·반환한다(Z·offset 없음).
// 기기 시각도 KST이므로 그대로 파싱하면 KST로 해석된다.
// Z를 붙이면 UTC로 오인 → +9h 이중 변환되어 날짜가 밀린다.
function parseServerKst(isoString: string): Date {
    return new Date(isoString);
}

function formatSessionDate(isoString: string) {
    const d = parseServerKst(isoString);
    return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

function localDateKey(isoString: string): string {
    const d = parseServerKst(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPlanBodyParts(plan: WorkoutPlan): string[] {
    if (plan.name) {
        return plan.name
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
    }
    const parts = plan.plan_exercises.map((pe) => pe.exercise.muscle_group);
    return [...new Set(parts)];
}

interface DayRecord {
    dateKey: string;
    dateLabel: string;
    totalXp: number;
    parts: string[];
}

function DayRow({
    record,
    showDivider,
}: {
    record: DayRecord;
    showDivider: boolean;
}) {
    const partsLabel = record.parts
        .map((p) => BODY_PART_KO[p] ?? p)
        .join(" · ");
    return (
        <>
            {showDivider && <View style={styles.sessionDivider} />}
            <View style={styles.sessionRow}>
                <View style={styles.sessionLeft}>
                    <Text style={styles.sessionDate}>{record.dateLabel}</Text>
                    {partsLabel ? (
                        <Text style={styles.sessionParts}>{partsLabel}</Text>
                    ) : null}
                </View>
                <View style={styles.sessionRight}>
                    <Text style={styles.sessionXp}>+{record.totalXp} XP</Text>
                </View>
            </View>
        </>
    );
}

export default function WorkoutTab() {
    const insets = useSafeAreaInsets();
    const {
        plans,
        sessions,
        fetchPlans,
        fetchSessions,
        plansLoading,
        sessionsLoading,
    } = useWorkoutStore();

    // 완료 흐름 상태
    const [completedToday, setCompletedToday] = useState(false);
    const [todaySessionId, setTodaySessionId] = useState<number | null>(null);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [selectedParts, setSelectedParts] = useState<string[]>([]);
    const [careMessage, setCareMessage] = useState<string | null>(null);
    const [careType, setCareType] = useState<"pre" | "post">("pre");
    const [saving, setSaving] = useState(false);

    // 세션 복원은 최초 1회만 (sessions 리패치마다 post 캐시 재기입 방지)
    const sessionRestoredRef = useRef(false);

    // 완료 모달 애니메이션
    const [sheetMounted, setSheetMounted] = useState(false);
    const sheetTy = useRef(new Animated.Value(900)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    // 열기: 두 상태를 동시에 올리고 RAF로 애니메이션 시작
    function openCompletionSheet() {
        if (!completedToday) setSelectedParts(modalBodyParts);
        sheetTy.setValue(900);
        overlayOpacity.setValue(0);
        setSheetMounted(true);
        setShowCompletionModal(true);
    }

    // 닫기: 애니메이션 완료 후 두 상태를 동시에 내림 (desync 방지)
    function dismissCompletionSheet() {
        Animated.parallel([
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(sheetTy, {
                toValue: 900,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) {
                setSheetMounted(false);
                setShowCompletionModal(false);
            }
        });
    }

    // showCompletionModal이 true가 된 직후 슬라이드-인 시작
    useEffect(() => {
        if (!showCompletionModal) return;
        requestAnimationFrame(() => {
            Animated.parallel([
                Animated.timing(overlayOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(sheetTy, {
                    toValue: 0,
                    tension: 65,
                    friction: 12,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    }, [showCompletionModal]);

    useEffect(() => {
        fetchPlans();
        fetchSessions();
        (async () => {
            // post 캐시 먼저 확인 (운동 완료 후 재시작 시 플래시 방지)
            const cachedPost = await getPostCareMessage();
            if (cachedPost) {
                setCareMessage(cachedPost);
                setCareType("post");
                return;
            }
            // pre 케어 — FCM 캐시 우선, 없으면 on-demand
            const cached = await getPreCareMessage();
            if (cached) {
                setCareMessage(cached);
            } else {
                fetchPreCareMessage()
                    .then((msg) => {
                        setCareMessage(msg);
                        void setPreCareMessage(msg);
                    })
                    .catch(() => {});
            }
        })();
    }, []);

    // 앱 재시작 후 오늘 완료 세션 복원 — 최초 1회만 실행
    useEffect(() => {
        if (sessionsLoading || sessionRestoredRef.current) return;
        sessionRestoredRef.current = true;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todaySession = sessions.find(
            (s) =>
                s.status === "completed" &&
                parseServerKst(s.started_at) >= todayStart,
        );
        if (todaySession) {
            setCompletedToday(true);
            setTodaySessionId(todaySession.id);
            setSelectedParts(
                todaySession.completed_parts
                    ? todaySession.completed_parts.split(",").filter(Boolean)
                    : [],
            );
            if (todaySession.ai_feedback) {
                setCareMessage(todaySession.ai_feedback);
                setCareType("post");
                void setPostCareMessage(todaySession.ai_feedback);
            }
        }
    }, [sessions, sessionsLoading]);

    const todayPlan = useMemo(() => {
        const today = todayBackendDay();
        return plans.find((p) => p.day_of_week === today) ?? null;
    }, [plans]);

    const weekCount = useMemo(() => {
        const weekStart = getWeekStart();
        return sessions.filter(
            (s) =>
                s.status === "completed" && parseServerKst(s.started_at) >= weekStart,
        ).length;
    }, [sessions]);

    const recentDayRecords = useMemo((): DayRecord[] => {
        // sessions은 started_at DESC 정렬 → 날짜별 첫 번째(최신)만 사용
        const seen = new Set<string>();
        const records: DayRecord[] = [];
        for (const s of sessions) {
            if (s.status !== "completed") continue;
            const dateKey = localDateKey(s.started_at);
            if (seen.has(dateKey)) continue;
            seen.add(dateKey);
            records.push({
                dateKey,
                dateLabel: formatSessionDate(s.started_at),
                totalXp: s.xp_earned,
                parts: s.completed_parts
                    ? s.completed_parts.split(",").filter(Boolean)
                    : [],
            });
            if (records.length >= 5) break;
        }
        return records;
    }, [sessions]);

    // 모달에 표시할 부위 목록
    // 플랜이 있고 휴식일이 아니면 → 플랜 부위만 / 그 외 → 전체 부위
    const modalBodyParts = useMemo(() => {
        if (todayPlan && !todayPlan.is_rest_day) {
            return getPlanBodyParts(todayPlan);
        }
        return ALL_BODY_PARTS.map((b) => b.key);
    }, [todayPlan]);

    const today = new Date();
    const todayLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${WEEKDAYS[today.getDay()]}요일`;

    function togglePart(part: string) {
        setSelectedParts((prev) =>
            prev.includes(part)
                ? prev.filter((p) => p !== part)
                : [...prev, part],
        );
    }

    async function handleSave() {
        setSaving(true);
        dismissCompletionSheet();
        // 쉬트 dismiss 애니메이션(220ms) 완료 후 성공 모달 표시
        // iOS는 Modal이 닫히기 전에 다른 Modal을 열면 두 번째가 무시됨
        await new Promise((resolve) => setTimeout(resolve, 280));
        setShowSuccessModal(true);

        // 최초 완료 여부: 이미 완료된 세션 수정이 아니면 최초 완료 → 실패 시 롤백 대상
        const isFirstCompletion = !(completedToday && todaySessionId !== null);

        try {
            let result;
            if (completedToday && todaySessionId !== null) {
                // 수정: 부위 변경분만큼만 XP 조정, 기본 XP 없음
                result = await updateSessionParts(
                    todaySessionId,
                    selectedParts,
                );
                // API 응답 기준으로 즉시 반영 (fetchSessions 완료 전 타이밍 갭 방지)
                const confirmedParts = result.completed_parts
                    ? result.completed_parts.split(",").filter(Boolean)
                    : [];
                setSelectedParts(confirmedParts);
            } else {
                // 최초 완료
                const { id: sessionId } = await startWorkoutSession(
                    todayPlan?.id,
                );
                result = await completeWorkoutSession(sessionId, {
                    sets: [],
                    completed_parts: selectedParts,
                });
                setTodaySessionId(sessionId);
            }
            setCompletedToday(true);
            setCareType("post");
            if (result.ai_feedback) {
                setCareMessage(result.ai_feedback);
                void setPostCareMessage(result.ai_feedback);
            }
            fetchSessions(true);
        } catch {
            // 최초 완료 도중 실패한 경우에만 상태 롤백 (수정 실패는 기존 완료 상태 유지)
            if (isFirstCompletion) {
                setCompletedToday(false);
                setTodaySessionId(null);
            }
            Alert.alert(
                "저장 실패",
                "운동 기록을 저장하지 못했어요. 다시 시도해주세요.",
            );
        } finally {
            setShowSuccessModal(false);
            setSaving(false);
        }
    }

    // 완료 버튼 위치: 탭 바 바로 위 (탭 바와 동일한 bottom 기준 + 탭 바 높이 + gap)
    const completionButtonBottom = insets.bottom + 10 + TAB_BAR_HEIGHT + 8;

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            <TabBackground
                accentColor="rgba(255,114,0,0.40)"
                secondaryColor="rgba(255,195,0,0.35)"
                fadeToColor={colors.bg}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingBottom:
                            insets.bottom + 10 + TAB_BAR_HEIGHT + 8 + 56 + 24,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* 헤더 */}
                <View style={styles.header}>
                    <Text style={styles.dateTitle}>운동</Text>
                    <Text style={styles.greeting}>
                        {todayLabel}
                        {!sessionsLoading && ` · 이번 주 ${weekCount}회`}
                    </Text>
                </View>

                {/* 오늘의 플랜 */}
                <BlurView intensity={70} tint="light" style={styles.card}>
                    <View style={styles.cardOverlay}>
                        <Text style={styles.cardLabel}>
                            오늘의 플랜
                            {todayPlan?.planned_time
                                ? ` · ${utcTimeToLocal(todayPlan.planned_time)}`
                                : ""}
                        </Text>
                        {plansLoading ? (
                            <ActivityIndicator
                                color={colors.accentOrange}
                                style={styles.loader}
                            />
                        ) : todayPlan == null ? (
                            <Text style={styles.emptyText}>
                                오늘 등록된 운동 플랜이 없어요
                            </Text>
                        ) : todayPlan.is_rest_day ? (
                            <View style={styles.restDayRow}>
                                <Text style={styles.restDayEmoji}>😴</Text>
                                <Text style={styles.restDayText}>
                                    오늘은 휴식일이에요
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.chipsRow}>
                                {getPlanBodyParts(todayPlan).map((part) => {
                                    const done =
                                        completedToday &&
                                        selectedParts.includes(part);
                                    return (
                                        <View
                                            key={part}
                                            style={[
                                                styles.chip,
                                                done && styles.chipDone,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.chipText,
                                                    done && styles.chipTextDone,
                                                ]}
                                            >
                                                {BODY_PART_KO[part] ?? part}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </BlurView>

                {/* AI 케어 팁 */}
                <BlurView intensity={70} tint="light" style={styles.card}>
                    <View style={styles.cardOverlay}>
                        <Text style={styles.cardLabel}>
                            {careType === "post"
                                ? "운동 후 케어 팁"
                                : "운동 전 케어 팁"}
                        </Text>
                        {careMessage ? (
                            <Text style={styles.careText}>{careMessage}</Text>
                        ) : (
                            <Text style={styles.emptyText}>
                                {careType === "post"
                                    ? "오늘 운동 수고했어요! 리커버리 팁을 준비 중이에요."
                                    : "오늘의 운동 전 케어 팁을 불러오는 중이에요."}
                            </Text>
                        )}
                    </View>
                </BlurView>

                {/* 최근 기록 */}
                <BlurView intensity={70} tint="light" style={styles.card}>
                    <View style={styles.cardOverlay}>
                        <Text style={styles.cardLabel}>최근 기록</Text>
                        {sessionsLoading ? (
                            <ActivityIndicator
                                color={colors.accentOrange}
                                style={styles.loader}
                            />
                        ) : recentDayRecords.length === 0 ? (
                            <Text style={styles.emptyText}>
                                아직 운동 기록이 없어요
                            </Text>
                        ) : (
                            recentDayRecords.map((record, i) => (
                                <DayRow
                                    key={record.dateKey}
                                    record={record}
                                    showDivider={i > 0}
                                />
                            ))
                        )}
                    </View>
                </BlurView>
            </ScrollView>

            {/* 오늘의 플랜 완료 버튼 — 탭 바 위 고정 */}
            <View
                style={[
                    styles.completionWrap,
                    { bottom: completionButtonBottom },
                ]}
            >
                <BlurView
                    intensity={55}
                    tint="light"
                    style={styles.completionBlur}
                >
                    <Pressable
                        onPress={openCompletionSheet}
                        style={[
                            styles.completionInner,
                            completedToday
                                ? styles.completionDone
                                : styles.completionPending,
                        ]}
                    >
                        <Text
                            style={[
                                styles.completionLabel,
                                completedToday && styles.completionLabelDone,
                            ]}
                        >
                            {completedToday
                                ? "오늘의 플랜 완료 등록 수정"
                                : "오늘의 플랜 완료"}
                        </Text>
                    </Pressable>
                </BlurView>
            </View>

            {/* ── 부위 선택 모달 ── */}
            <Modal
                visible={sheetMounted}
                transparent
                animationType="none"
                onRequestClose={dismissCompletionSheet}
            >
                <Animated.View
                    style={[styles.backdrop, { opacity: overlayOpacity }]}
                >
                    <Pressable
                        style={{ flex: 1 }}
                        onPress={dismissCompletionSheet}
                    />
                    <Animated.View
                        style={[
                            styles.sheet,
                            {
                                paddingBottom: insets.bottom + 20,
                                transform: [{ translateY: sheetTy }],
                            },
                        ]}
                    >
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>
                            {completedToday
                                ? "완료 부위 수정"
                                : "오늘 운동한 부위를 확인해요"}
                        </Text>
                        <Text style={styles.sheetSub}>
                            탭해서 선택 해제할 수 있어요
                        </Text>

                        <View style={styles.sheetChips}>
                            {modalBodyParts.map((part) => {
                                const selected = selectedParts.includes(part);
                                return (
                                    <Pressable
                                        key={part}
                                        onPress={() => togglePart(part)}
                                        style={[
                                            styles.sheetChip,
                                            selected && styles.sheetChipOn,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.sheetChipText,
                                                selected &&
                                                    styles.sheetChipTextOn,
                                            ]}
                                        >
                                            {BODY_PART_KO[part] ?? part}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Pressable
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Text style={styles.saveBtnText}>저장</Text>
                        </Pressable>
                    </Animated.View>
                </Animated.View>
            </Modal>

            {/* ── 완료 처리 중 모달 ── */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <BlurView intensity={60} tint="light" style={styles.successOverlay}>
                    <Text style={styles.successEmoji}>🎉</Text>
                    <Text style={styles.successTitle}>수고 많았어요!</Text>
                    <Text style={styles.successSub}>
                        운동 후 팁을 곧 보내드릴게요
                    </Text>
                    <ActivityIndicator
                        color={colors.accentOrange}
                        style={{ marginTop: 24 }}
                    />
                </BlurView>
            </Modal>
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
    loader: {
        marginVertical: 8,
    },

    // ── 헤더
    header: {
        paddingTop: 40,
        paddingBottom: 24,
    },
    dateTitle: {
        fontSize: fontSize.largeTitle,
        lineHeight: 41,
        fontWeight: fontWeight.bold,
        color: "#7A2E00",
        letterSpacing: -0.5,
    },
    greeting: {
        fontSize: fontSize.subhead,
        lineHeight: 20,
        color: "#C06825",
        marginTop: 4,
    },

    // ── 공통 카드
    card: {
        borderRadius: 16,
        marginBottom: 12,
        overflow: "hidden",
    },
    cardOverlay: {
        backgroundColor: "rgba(255,255,255,0.8)",
        padding: 16,
    },
    cardLabel: {
        fontSize: fontSize.footnote,
        fontWeight: fontWeight.semibold,
        color: "#C06825",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: fontSize.body,
        color: "#C06825",
        opacity: 0.6,
    },

    // ── AI 케어 팁
    careText: {
        fontSize: fontSize.body,
        color: "#7A2E00",
        lineHeight: 24,
    },

    // ── 오늘의 플랜
    restDayRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    restDayEmoji: {
        fontSize: 24,
    },
    restDayText: {
        fontSize: fontSize.body,
        color: "#7A2E00",
    },
    chipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        backgroundColor: "rgba(255,114,0,0.12)",
        borderWidth: 1,
        borderColor: "rgba(255,114,0,0.30)",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    chipDone: {
        backgroundColor: colors.accentOrange,
        borderColor: colors.accentOrange,
    },
    chipText: {
        fontSize: fontSize.footnote,
        fontWeight: fontWeight.semibold,
        color: "#C06825",
    },
    chipTextDone: {
        color: "#FFFFFF",
    },

    // ── 최근 기록
    sessionRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
    },
    sessionLeft: {
        flex: 1,
        gap: 2,
    },
    sessionDate: {
        fontSize: fontSize.callout,
        fontWeight: fontWeight.semibold,
        color: "#7A2E00",
    },
    sessionParts: {
        fontSize: fontSize.footnote,
        color: "#C06825",
    },
    sessionRight: {
        alignItems: "flex-end",
        gap: 2,
    },
    sessionXp: {
        fontSize: fontSize.footnote,
        fontWeight: fontWeight.semibold,
        color: colors.accentOrange,
    },
    sessionDivider: {
        height: 1,
        backgroundColor: "rgba(255,114,0,0.15)",
    },

    // ── 완료 버튼 (고정)
    completionWrap: {
        position: "absolute",
        left: 16,
        right: 16,
        shadowColor: "#FF7200",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 8,
    },
    completionBlur: {
        borderRadius: 999,
        overflow: "hidden",
    },
    completionInner: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
    },
    completionPending: {
        backgroundColor: "rgba(255,114,0,0.88)",
    },
    completionDone: {
        backgroundColor: "rgba(255,114,0,0.88)",
    },
    completionLabel: {
        fontSize: fontSize.headline,
        fontWeight: fontWeight.semibold,
        color: "#FFFFFF",
    },
    completionLabelDone: {
        color: "#FFFFFF",
    },

    // ── 부위 선택 모달
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.30)",
    },
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingTop: 12,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 10,
        marginBottom: 4,
    },
    sheetTitle: {
        fontSize: fontSize.title3,
        fontWeight: fontWeight.bold,
        color: "#7A2E00",
        marginBottom: 6,
    },
    sheetSub: {
        fontSize: fontSize.footnote,
        color: "#C06825",
        opacity: 0.7,
        marginBottom: 20,
    },
    sheetChips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 28,
    },
    sheetChip: {
        borderWidth: 1.5,
        borderColor: "rgba(255,114,0,0.30)",
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    sheetChipOn: {
        backgroundColor: colors.accentOrange,
        borderColor: colors.accentOrange,
    },
    sheetChipText: {
        fontSize: fontSize.callout,
        fontWeight: fontWeight.semibold,
        color: "#C06825",
    },
    sheetChipTextOn: {
        color: "#FFFFFF",
    },
    saveBtn: {
        backgroundColor: colors.accentOrange,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
    },
    saveBtnText: {
        fontSize: fontSize.headline,
        fontWeight: fontWeight.bold,
        color: "#FFFFFF",
    },

    // ── 완료 처리 중 모달
    successOverlay: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.55)",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
    },
    successEmoji: {
        fontSize: 64,
        marginBottom: 8,
    },
    successTitle: {
        fontSize: fontSize.title1,
        fontWeight: fontWeight.bold,
        color: "#7A2E00",
    },
    successSub: {
        fontSize: fontSize.body,
        color: "#C06825",
    },
});
