import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    type DimensionValue,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "@/constants/colors";
import { fontSize, fontWeight } from "@/constants/typography";
import { localTimeToUTC, utcTimeToLocal } from "@/utils/time";
import {
    createWorkoutPlan,
    deleteWorkoutPlan,
    fetchInbodyHistory,
    fetchMe,
    fetchNotificationSettings,
    fetchWorkoutPlans,
    getApiErrorMessage,
    submitInbody,
    fetchSleepStats,
    fetchTodayHealthStats,
    triggerDebugNotification,
    updateNotificationSettings,
    updateProfile,
    updateSleepGoal,
    updateWorkoutPlan,
} from "@/services/api";
import { syncDailyMetrics, syncSleepData } from "@/services/health";
import { clearCareCache } from "@/services/careCache";
import {
    PixelCharacter,
    CELL_SIZE,
    type CharacterState,
    type EnergyLevel,
    type GrowthLevel,
} from "@/components/PixelCharacter";
import { useAuthStore } from "@/store/authStore";
import { useDebugStore } from "@/store/debugStore";
import type {
    BodyPart,
    FitnessLevel,
    InBodyInput,
    InBodyRecord,
    NotificationSettings,
    NotificationSettingsUpdate,
    ProfileUpdatePayload,
    User,
    WorkoutPlan,
} from "@/types";

// ── 상수 ──────────────────────────────────────────────────────────────────────

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

const DEBUG_CHARACTER_STATES: { state: CharacterState; label: string }[] = [
    { state: "neutral", label: "기본" },
    { state: "happy", label: "최고 컨디션" },
    { state: "tired", label: "수면 부족" },
    { state: "sleeping", label: "수면 중" },
    { state: "workout", label: "운동 중" },
    { state: "flex", label: "운동 완료" },
    { state: "sedentary", label: "운동 부족" },
    { state: "overfed", label: "식단 불균형" },
    { state: "derailed", label: "루틴 깨짐" },
];

const BODY_PARTS: { key: BodyPart; label: string }[] = [
    { key: "chest", label: "가슴" },
    { key: "back", label: "등" },
    { key: "shoulder", label: "어깨" },
    { key: "arm", label: "팔" },
    { key: "leg", label: "하체" },
    { key: "core", label: "코어" },
    { key: "cardio", label: "유산소" },
];

const FITNESS_LEVELS: {
    key: FitnessLevel;
    emoji: string;
    name: string;
    desc: string;
}[] = [
    {
        key: "beginner",
        emoji: "🌱",
        name: "초보자",
        desc: "운동을 처음 시작하는 단계예요",
    },
    {
        key: "intermediate",
        emoji: "💪",
        name: "중급자",
        desc: "꾸준히 운동해온 경험이 있어요",
    },
    {
        key: "advanced",
        emoji: "🏆",
        name: "상급자",
        desc: "고강도 훈련에 익숙한 수준이에요",
    },
    {
        key: "athlete",
        emoji: "🥇",
        name: "선수급",
        desc: "전문적인 훈련을 받는 수준이에요",
    },
];

const FITNESS_LABEL: Record<FitnessLevel, string> = {
    beginner: "초보자",
    intermediate: "중급자",
    advanced: "상급자",
    athlete: "선수급",
};

function bodyPartsFromPlan(plan: WorkoutPlan): BodyPart[] {
    if (plan.is_rest_day || !plan.name) return [];
    return plan.name.split(",").filter(Boolean) as BodyPart[];
}

function bodyPartLabel(part: BodyPart): string {
    return BODY_PARTS.find((b) => b.key === part)?.label ?? part;
}

function parseTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    return { hour: h ?? 0, minuteIdx: Math.round((m ?? 0) / 5) };
}

function calcSleepDuration(
    bedH: number,
    bedMIdx: number,
    wakeH: number,
    wakeMIdx: number,
): string {
    const bedMins = bedH * 60 + bedMIdx * 5;
    const wakeMins = wakeH * 60 + wakeMIdx * 5;
    let diff = wakeMins - bedMins;
    if (diff <= 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

// ── TimeDrum ──────────────────────────────────────────────────────────────────

const DRUM_ITEM_H = 52;
const DRUM_VISIBLE = 3;
const DRUM_HALF = Math.floor(DRUM_VISIBLE / 2);
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
    String(i * 5).padStart(2, "0"),
);

function TimeDrum({
    values,
    initialIndex,
    onChange,
}: {
    values: string[];
    initialIndex: number;
    onChange: (i: number) => void;
}) {
    const ref = useRef<ScrollView>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            ref.current?.scrollTo({
                y: initialIndex * DRUM_ITEM_H,
                animated: false,
            });
        }, 50);
        return () => clearTimeout(t);
    }, [initialIndex]);

    const handleEnd = (e: {
        nativeEvent: { contentOffset: { y: number } };
    }) => {
        const idx = Math.round(e.nativeEvent.contentOffset.y / DRUM_ITEM_H);
        onChange(Math.max(0, Math.min(idx, values.length - 1)));
    };

    return (
        <View style={drumStyles.outer}>
            <View pointerEvents="none" style={drumStyles.indicator} />
            <ScrollView
                ref={ref}
                showsVerticalScrollIndicator={false}
                snapToInterval={DRUM_ITEM_H}
                decelerationRate="normal"
                contentContainerStyle={drumStyles.content}
                onMomentumScrollEnd={handleEnd}
                onScrollEndDrag={handleEnd}
            >
                {values.map((v, i) => (
                    <View key={i} style={drumStyles.item}>
                        <Text style={drumStyles.itemText}>{v}</Text>
                    </View>
                ))}
            </ScrollView>
            <LinearGradient
                pointerEvents="none"
                colors={[colors.bg, "rgba(242,242,247,0)"]}
                style={drumStyles.fadeTop}
            />
            <LinearGradient
                pointerEvents="none"
                colors={["rgba(242,242,247,0)", colors.bg]}
                style={drumStyles.fadeBottom}
            />
        </View>
    );
}

const drumStyles = StyleSheet.create({
    outer: {
        height: DRUM_ITEM_H * DRUM_VISIBLE,
        overflow: "hidden",
        flex: 1,
    },
    indicator: {
        position: "absolute",
        top: DRUM_ITEM_H * DRUM_HALF,
        height: DRUM_ITEM_H,
        left: 0,
        right: 0,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        zIndex: 1,
    },
    content: { paddingVertical: DRUM_ITEM_H * DRUM_HALF },
    item: {
        height: DRUM_ITEM_H,
        justifyContent: "center",
        alignItems: "center",
    },
    itemText: { fontSize: 26, fontWeight: "300", color: colors.text },
    fadeTop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: DRUM_ITEM_H * DRUM_HALF,
        zIndex: 2,
    },
    fadeBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: DRUM_ITEM_H * DRUM_HALF,
        zIndex: 2,
    },
});

// ── 공통 Row 컴포넌트 ──────────────────────────────────────────────────────────

function ProfileRow({
    label,
    value,
    onPress,
    isLast = false,
}: {
    label: string;
    value?: string;
    onPress?: () => void;
    isLast?: boolean;
}) {
    const inner = (
        <View style={[rowStyles.row, !isLast && rowStyles.rowBorder]}>
            <Text style={rowStyles.label}>{label}</Text>
            <View style={rowStyles.right}>
                {value != null ? (
                    <Text style={rowStyles.value} numberOfLines={1}>
                        {value}
                    </Text>
                ) : null}
                {onPress ? (
                    <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.text3}
                    />
                ) : null}
            </View>
        </View>
    );
    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                android_ripple={{ color: colors.separator }}
            >
                {inner}
            </Pressable>
        );
    }
    return inner;
}

function NotifRow({
    label,
    value,
    onToggle,
    isLast = false,
}: {
    label: string;
    value: boolean;
    onToggle: (v: boolean) => void;
    isLast?: boolean;
}) {
    return (
        <View
            style={[
                rowStyles.row,
                !isLast && rowStyles.rowBorder,
                { paddingRight: 22 },
            ]}
        >
            <Text style={rowStyles.label}>{label}</Text>
            <Switch value={value} onValueChange={onToggle} />
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 13,
        paddingHorizontal: 16,
        minHeight: 48,
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.separator,
    },
    label: { fontSize: fontSize.body, color: colors.text },
    right: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        flex: 1,
        justifyContent: "flex-end",
    },
    value: {
        fontSize: fontSize.body,
        color: colors.text3,
        maxWidth: "60%",
        textAlign: "right",
    },
});

// ── 공통 모달 스타일 ────────────────────────────────────────────────────────────

const mStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handle: {
        width: 36,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 10,
        marginBottom: 4,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.separator,
    },
    title: {
        fontSize: fontSize.headline,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    body: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 34,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: colors.separator,
    },
    saveBtn: {
        backgroundColor: colors.accent,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: "center",
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: {
        color: colors.white,
        fontSize: fontSize.headline,
        fontWeight: fontWeight.semibold,
    },
    errorText: {
        color: colors.red,
        fontSize: fontSize.subhead,
        textAlign: "center",
        marginTop: 10,
    },
    label: {
        fontSize: fontSize.subhead,
        fontWeight: fontWeight.semibold,
        color: colors.text2,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: fontSize.body,
        color: colors.text,
    },
});

// ── BottomSheet — 공통 바텀 시트 ──────────────────────────────────────────────

function BottomSheet({
    visible,
    onClose,
    keyboard = false,
    maxHeight = "85%" as DimensionValue,
    children,
}: {
    visible: boolean;
    onClose: () => void;
    keyboard?: boolean;
    maxHeight?: DimensionValue;
    children: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(false);
    const ty = useRef(new Animated.Value(900)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            ty.setValue(900);
            opacity.setValue(0);
            setMounted(true);
            requestAnimationFrame(() => {
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.spring(ty, {
                        toValue: 0,
                        tension: 65,
                        friction: 12,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        } else {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(ty, {
                    toValue: 900,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished) setMounted(false);
            });
        }
    }, [visible]);

    const sheet = (
        <Animated.View
            style={[mStyles.sheet, { transform: [{ translateY: ty }] }]}
        >
            {children}
        </Animated.View>
    );

    return (
        <Modal
            visible={mounted}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[mStyles.overlay, { opacity }]}>
                <Pressable style={{ flex: 1 }} onPress={onClose} />
                {keyboard ? (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ maxHeight }}
                    >
                        {sheet}
                    </KeyboardAvoidingView>
                ) : (
                    <View style={{ maxHeight }}>{sheet}</View>
                )}
            </Animated.View>
        </Modal>
    );
}

// ── AccountModal — 닉네임 수정 ─────────────────────────────────────────────────

function AccountModal({
    visible,
    currentNickname,
    onClose,
}: {
    visible: boolean;
    currentNickname: string;
    onClose: () => void;
}) {
    const [nickname, setNickname] = useState(currentNickname);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setNickname(currentNickname);
            setError(null);
        }
    }, [visible, currentNickname]);

    async function handleSave() {
        const trimmed = nickname.trim();
        if (!trimmed) {
            setError("닉네임을 입력해주세요.");
            return;
        }
        setSaving(true);
        try {
            const updated = await updateProfile({ nickname: trimmed });
            useAuthStore.getState().setUser(updated);
            onClose();
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            keyboard
            maxHeight="85%"
        >
            <View style={mStyles.handle} />
            <View style={mStyles.header}>
                <Text style={mStyles.title}>닉네임 수정</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={colors.text3} />
                </Pressable>
            </View>
            <View style={[mStyles.body, { paddingBottom: 16 }]}>
                <Text style={mStyles.label}>닉네임</Text>
                <TextInput
                    style={mStyles.input}
                    value={nickname}
                    onChangeText={(t) => {
                        setNickname(t);
                        setError(null);
                    }}
                    placeholder="닉네임을 입력해주세요"
                    placeholderTextColor={colors.text3}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                />
                {error ? <Text style={mStyles.errorText}>{error}</Text> : null}
            </View>
            <View style={mStyles.footer}>
                <Pressable
                    style={[mStyles.saveBtn, saving && mStyles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={mStyles.saveBtnText}>저장</Text>
                    )}
                </Pressable>
            </View>
        </BottomSheet>
    );
}

// ── PhysicalModal — 신체 정보 수정 ────────────────────────────────────────────

function PhysicalModal({
    visible,
    user,
    onClose,
}: {
    visible: boolean;
    user: User;
    onClose: () => void;
}) {
    const [height, setHeight] = useState(
        user.height_cm ? String(user.height_cm) : "",
    );
    const [weight, setWeight] = useState(
        user.weight_kg ? String(user.weight_kg) : "",
    );
    const [fitness, setFitness] = useState<FitnessLevel>(user.fitness_level);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setHeight(user.height_cm ? String(user.height_cm) : "");
            setWeight(user.weight_kg ? String(user.weight_kg) : "");
            setFitness(user.fitness_level);
            setError(null);
        }
    }, [visible, user]);

    async function handleSave() {
        if (height.trim()) {
            const h = parseFloat(height);
            if (isNaN(h) || h < 100 || h > 250) {
                setError("키는 100~250cm 사이로 입력해주세요.");
                return;
            }
        }
        if (weight.trim()) {
            const w = parseFloat(weight);
            if (isNaN(w) || w < 30 || w > 300) {
                setError("몸무게는 30~300kg 사이로 입력해주세요.");
                return;
            }
        }
        setSaving(true);
        try {
            const payload: ProfileUpdatePayload = { fitness_level: fitness };
            if (height.trim()) payload.height_cm = parseFloat(height);
            if (weight.trim()) payload.weight_kg = parseFloat(weight);
            const updated = await updateProfile(payload);
            useAuthStore.getState().setUser(updated);
            onClose();
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            maxHeight="85%"
        >
            <View style={mStyles.handle} />
            <View style={mStyles.header}>
                <Text style={mStyles.title}>신체 정보 수정</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={colors.text3} />
                </Pressable>
            </View>
            <ScrollView
                style={mStyles.body}
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
            >
                <Text style={mStyles.label}>키 (cm)</Text>
                <TextInput
                    style={mStyles.input}
                    value={height}
                    onChangeText={(t) => {
                        setHeight(t);
                        setError(null);
                    }}
                    placeholder="예: 175"
                    placeholderTextColor={colors.text3}
                    keyboardType="decimal-pad"
                />
                <Text style={mStyles.label}>몸무게 (kg)</Text>
                <TextInput
                    style={mStyles.input}
                    value={weight}
                    onChangeText={(t) => {
                        setWeight(t);
                        setError(null);
                    }}
                    placeholder="예: 70"
                    placeholderTextColor={colors.text3}
                    keyboardType="decimal-pad"
                />
                <Text style={mStyles.label}>숙련도</Text>
                <View style={{ gap: 8 }}>
                    {FITNESS_LEVELS.map((level) => {
                        const selected = fitness === level.key;
                        return (
                            <Pressable
                                key={level.key}
                                style={[
                                    phyStyles.card,
                                    selected && phyStyles.cardSelected,
                                ]}
                                onPress={() => {
                                    setFitness(level.key);
                                    setError(null);
                                }}
                            >
                                <Text style={phyStyles.emoji}>
                                    {level.emoji}
                                </Text>
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={[
                                            phyStyles.name,
                                            selected && {
                                                color: colors.white,
                                            },
                                        ]}
                                    >
                                        {level.name}
                                    </Text>
                                    <Text
                                        style={[
                                            phyStyles.desc,
                                            selected && {
                                                color: "rgba(255,255,255,0.75)",
                                            },
                                        ]}
                                    >
                                        {level.desc}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
                {error ? <Text style={mStyles.errorText}>{error}</Text> : null}
            </ScrollView>
            <View style={mStyles.footer}>
                <Pressable
                    style={[mStyles.saveBtn, saving && mStyles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={mStyles.saveBtnText}>저장</Text>
                    )}
                </Pressable>
            </View>
        </BottomSheet>
    );
}

const phyStyles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: colors.bg,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    cardSelected: { backgroundColor: colors.accent },
    emoji: { fontSize: 26 },
    name: {
        fontSize: fontSize.callout,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    desc: { fontSize: fontSize.footnote, color: colors.text3, marginTop: 2 },
});

// ── SleepModal — 수면 목표 수정 ───────────────────────────────────────────────

function SleepModal({
    visible,
    user,
    onClose,
}: {
    visible: boolean;
    user: User;
    onClose: () => void;
}) {
    const initBed = parseTime(
        utcTimeToLocal(user.sleep_goal_bedtime ?? "23:00"),
    );
    const initWake = parseTime(
        utcTimeToLocal(user.sleep_goal_wakeup ?? "07:00"),
    );

    const [bedHour, setBedHour] = useState(initBed.hour);
    const [bedMinuteIdx, setBedMinuteIdx] = useState(initBed.minuteIdx);
    const [wakeHour, setWakeHour] = useState(initWake.hour);
    const [wakeMinuteIdx, setWakeMinuteIdx] = useState(initWake.minuteIdx);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            const b = parseTime(
                utcTimeToLocal(user.sleep_goal_bedtime ?? "23:00"),
            );
            const w = parseTime(
                utcTimeToLocal(user.sleep_goal_wakeup ?? "07:00"),
            );
            setBedHour(b.hour);
            setBedMinuteIdx(b.minuteIdx);
            setWakeHour(w.hour);
            setWakeMinuteIdx(w.minuteIdx);
            setError(null);
        }
    }, [visible, user]);

    async function handleSave() {
        const bedMins = bedHour * 60 + bedMinuteIdx * 5;
        const wakeMins = wakeHour * 60 + wakeMinuteIdx * 5;
        if (bedMins === wakeMins) {
            setError("취침 시간과 기상 시간이 같을 수 없어요.");
            return;
        }
        setSaving(true);
        const localBed = `${String(bedHour).padStart(2, "0")}:${String(bedMinuteIdx * 5).padStart(2, "0")}`;
        const localWake = `${String(wakeHour).padStart(2, "0")}:${String(wakeMinuteIdx * 5).padStart(2, "0")}`;
        const bedtime = localTimeToUTC(localBed);
        const wakeup = localTimeToUTC(localWake);
        try {
            const result = await updateSleepGoal(bedtime, wakeup);
            const current = useAuthStore.getState().user!;
            useAuthStore.getState().setUser({ ...current, ...result });
            onClose();
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setSaving(false);
        }
    }

    const duration = calcSleepDuration(
        bedHour,
        bedMinuteIdx,
        wakeHour,
        wakeMinuteIdx,
    );

    return (
        <BottomSheet visible={visible} onClose={onClose} maxHeight="85%">
            <View style={mStyles.handle} />
            <View style={mStyles.header}>
                <Text style={mStyles.title}>수면 목표 수정</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={colors.text3} />
                </Pressable>
            </View>
            <View style={{ padding: 20, gap: 12 }}>
                <View style={sleepStyles.card}>
                    <Text style={sleepStyles.cardLabel}>취침</Text>
                    <View style={sleepStyles.drumsRow}>
                        <TimeDrum
                            values={HOURS}
                            initialIndex={bedHour}
                            onChange={setBedHour}
                        />
                        <Text style={sleepStyles.colon}>:</Text>
                        <TimeDrum
                            values={MINUTES}
                            initialIndex={bedMinuteIdx}
                            onChange={setBedMinuteIdx}
                        />
                    </View>
                </View>
                <View style={sleepStyles.durationBadge}>
                    <Text style={sleepStyles.durationText}>
                        ∙∙∙ 총 수면 {duration} ∙∙∙
                    </Text>
                </View>
                <View style={sleepStyles.card}>
                    <Text style={sleepStyles.cardLabel}>기상</Text>
                    <View style={sleepStyles.drumsRow}>
                        <TimeDrum
                            values={HOURS}
                            initialIndex={wakeHour}
                            onChange={setWakeHour}
                        />
                        <Text style={sleepStyles.colon}>:</Text>
                        <TimeDrum
                            values={MINUTES}
                            initialIndex={wakeMinuteIdx}
                            onChange={setWakeMinuteIdx}
                        />
                    </View>
                </View>
                {error ? <Text style={mStyles.errorText}>{error}</Text> : null}
            </View>
            <View style={mStyles.footer}>
                <Pressable
                    style={[mStyles.saveBtn, saving && mStyles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={mStyles.saveBtnText}>저장</Text>
                    )}
                </Pressable>
            </View>
        </BottomSheet>
    );
}

const sleepStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.bg,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    cardLabel: {
        fontSize: fontSize.subhead,
        fontWeight: fontWeight.semibold,
        color: colors.text3,
        textAlign: "center",
        marginBottom: 4,
    },
    drumsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    colon: {
        fontSize: 26,
        fontWeight: "300",
        color: colors.text,
        paddingHorizontal: 4,
        lineHeight: DRUM_ITEM_H * DRUM_VISIBLE,
    },
    durationBadge: {
        alignSelf: "center",
        backgroundColor: colors.bg,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    durationText: {
        fontSize: fontSize.subhead,
        fontWeight: fontWeight.semibold,
        color: colors.text2,
    },
});

// ── RoutineModal — 운동 루틴 수정 ─────────────────────────────────────────────

function RoutineModal({
    visible,
    plans,
    onClose,
    onSaved,
    initialDay = 0,
}: {
    visible: boolean;
    plans: WorkoutPlan[];
    onClose: () => void;
    onSaved: (newPlans: WorkoutPlan[]) => void;
    initialDay?: number;
}) {
    const [routines, setRoutines] = useState<BodyPart[][]>(
        Array.from({ length: 7 }, (_, i) => {
            const plan = plans.find((p) => p.day_of_week === i);
            return plan ? bodyPartsFromPlan(plan) : [];
        }),
    );
    const [plannedTimes, setPlannedTimes] = useState<(string | null)[]>(
        Array.from({ length: 7 }, (_, i) => {
            const plan = plans.find((p) => p.day_of_week === i);
            return plan?.planned_time
                ? utcTimeToLocal(plan.planned_time)
                : null;
        }),
    );
    const [selectedDay, setSelectedDay] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setRoutines(
                Array.from({ length: 7 }, (_, i) => {
                    const plan = plans.find((p) => p.day_of_week === i);
                    return plan ? bodyPartsFromPlan(plan) : [];
                }),
            );
            setPlannedTimes(
                Array.from({ length: 7 }, (_, i) => {
                    const plan = plans.find((p) => p.day_of_week === i);
                    return plan?.planned_time
                        ? utcTimeToLocal(plan.planned_time)
                        : null;
                }),
            );
            setSelectedDay(initialDay);
            setError(null);
        }
    }, [visible, plans, initialDay]);

    function togglePart(part: BodyPart) {
        setRoutines((prev) => {
            const next = [...prev];
            const day = [...next[selectedDay]];
            const idx = day.indexOf(part);
            if (idx >= 0) day.splice(idx, 1);
            else day.push(part);
            next[selectedDay] = day;
            return next;
        });
    }

    function handleTimeToggle(enabled: boolean) {
        const next = [...plannedTimes];
        next[selectedDay] = enabled ? "18:00" : null;
        setPlannedTimes(next);
    }

    function handleHourChange(i: number) {
        const next = [...plannedTimes];
        const { minuteIdx } = parseTime(next[selectedDay] ?? "18:00");
        next[selectedDay] =
            `${String(i).padStart(2, "0")}:${String(minuteIdx * 5).padStart(2, "0")}`;
        setPlannedTimes(next);
    }

    function handleMinChange(i: number) {
        const next = [...plannedTimes];
        const { hour } = parseTime(next[selectedDay] ?? "18:00");
        next[selectedDay] =
            `${String(hour).padStart(2, "0")}:${String(i * 5).padStart(2, "0")}`;
        setPlannedTimes(next);
    }

    async function handleSave() {
        setSaving(true);
        try {
            const newPlans: WorkoutPlan[] = [];
            for (let day = 0; day < 7; day++) {
                const parts = routines[day];
                const existing = plans.find((p) => p.day_of_week === day);
                if (parts.length > 0) {
                    const utcTime = plannedTimes[day]
                        ? localTimeToUTC(plannedTimes[day]!)
                        : null;
                    if (existing) {
                        const updated = await updateWorkoutPlan(
                            existing.id,
                            parts,
                            utcTime,
                        );
                        newPlans.push(updated);
                    } else {
                        const created = await createWorkoutPlan(
                            day,
                            parts,
                            utcTime ?? undefined,
                        );
                        newPlans.push(created);
                    }
                } else if (existing) {
                    await deleteWorkoutPlan(existing.id);
                }
            }
            onSaved(newPlans);
            onClose();
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <BottomSheet visible={visible} onClose={onClose} maxHeight="80%">
            <View style={mStyles.handle} />
            <View style={mStyles.header}>
                <Text style={mStyles.title}>운동 루틴 수정</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={colors.text3} />
                </Pressable>
            </View>
            {/* 요일 탭 */}
            <View style={routineStyles.dayRow}>
                {DAY_LABELS.map((label, i) => {
                    const isSelected = selectedDay === i;
                    const hasSchedule = routines[i].length > 0;
                    return (
                        <Pressable
                            key={i}
                            onPress={() => setSelectedDay(i)}
                            style={[
                                routineStyles.dayChip,
                                isSelected
                                    ? routineStyles.dayChipSelected
                                    : hasSchedule
                                      ? routineStyles.dayChipScheduled
                                      : routineStyles.dayChipEmpty,
                            ]}
                        >
                            <Text
                                style={[
                                    routineStyles.dayChipText,
                                    isSelected
                                        ? routineStyles.dayChipTextSelected
                                        : hasSchedule
                                          ? routineStyles.dayChipTextScheduled
                                          : undefined,
                                ]}
                            >
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 16,
                    paddingBottom: 16,
                }}
            >
                <Text style={mStyles.label}>
                    {DAY_LABELS[selectedDay]}요일 운동 부위
                </Text>
                <View style={routineStyles.partGrid}>
                    {BODY_PARTS.map(({ key, label }) => {
                        const selected = routines[selectedDay].includes(key);
                        return (
                            <Pressable
                                key={key}
                                style={[
                                    routineStyles.partChip,
                                    selected && routineStyles.partChipSelected,
                                ]}
                                onPress={() => togglePart(key)}
                            >
                                <Text
                                    style={[
                                        routineStyles.partChipText,
                                        selected &&
                                            routineStyles.partChipTextSelected,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* 운동 예정 시각 */}
                <View style={routineStyles.timeHeaderRow}>
                    <Text style={routineStyles.timeLabel}>운동 예정 시각</Text>
                    <Switch
                        value={plannedTimes[selectedDay] !== null}
                        onValueChange={handleTimeToggle}
                        trackColor={{ true: colors.accent }}
                    />
                </View>
                {plannedTimes[selectedDay] !== null && (
                    <View key={`drum-${selectedDay}`} style={sleepStyles.card}>
                        <View style={sleepStyles.drumsRow}>
                            <TimeDrum
                                values={HOURS}
                                initialIndex={
                                    parseTime(
                                        plannedTimes[selectedDay] ?? "18:00",
                                    ).hour
                                }
                                onChange={handleHourChange}
                            />
                            <Text style={sleepStyles.colon}>:</Text>
                            <TimeDrum
                                values={MINUTES}
                                initialIndex={
                                    parseTime(
                                        plannedTimes[selectedDay] ?? "18:00",
                                    ).minuteIdx
                                }
                                onChange={handleMinChange}
                            />
                        </View>
                    </View>
                )}

                {error ? <Text style={mStyles.errorText}>{error}</Text> : null}
            </ScrollView>
            <View style={mStyles.footer}>
                <Pressable
                    style={[mStyles.saveBtn, saving && mStyles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={mStyles.saveBtnText}>저장</Text>
                    )}
                </Pressable>
            </View>
        </BottomSheet>
    );
}

const routineStyles = StyleSheet.create({
    dayRow: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.separator,
    },
    dayChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
    },
    dayChipEmpty: { backgroundColor: "#EBEBF0" },
    dayChipScheduled: { backgroundColor: "#D1E0FF" },
    dayChipSelected: { backgroundColor: colors.accent },
    dayChipText: { fontSize: fontSize.subhead, color: colors.text2 },
    dayChipTextScheduled: {
        color: colors.accent,
        fontWeight: fontWeight.semibold,
    },
    dayChipTextSelected: {
        color: colors.white,
        fontWeight: fontWeight.semibold,
    },
    partGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    timeHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 20,
        marginBottom: 10,
        paddingRight: 10,
    },
    timeLabel: {
        fontSize: fontSize.subhead,
        fontWeight: fontWeight.semibold,
        color: colors.text2,
    },
    partChip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: colors.bg,
    },
    partChipSelected: { backgroundColor: colors.accent },
    partChipText: { fontSize: fontSize.callout, color: colors.text },
    partChipTextSelected: {
        color: colors.white,
        fontWeight: fontWeight.semibold,
    },
});

// ── InBodyModal — 인바디 측정 기록 추가 ───────────────────────────────────────

function InBodyModal({
    visible,
    onClose,
    onSaved,
}: {
    visible: boolean;
    onClose: () => void;
    onSaved: (record: InBodyRecord) => void;
}) {
    const [weight, setWeight] = useState("");
    const [bodyFat, setBodyFat] = useState("");
    const [muscle, setMuscle] = useState("");
    const [bmi, setBmi] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setWeight("");
            setBodyFat("");
            setMuscle("");
            setBmi("");
            setError(null);
        }
    }, [visible]);

    async function handleSave() {
        // 서버는 KST naive datetime을 저장한다. toISOString()은 UTC라 다른 시각들과
        // 기준이 어긋나므로 KST 로컬 시각을 'YYYY-MM-DDTHH:mm:ss'(offset 없음)로 보낸다.
        const now = new Date();
        const measuredAt =
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-` +
            `${String(now.getDate()).padStart(2, "0")}T` +
            `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:` +
            `${String(now.getSeconds()).padStart(2, "0")}`;
        const input: InBodyInput = { measured_at: measuredAt };
        if (weight.trim()) {
            const v = parseFloat(weight);
            if (isNaN(v) || v < 30 || v > 300) {
                setError("몸무게를 다시 확인해주세요.");
                return;
            }
            input.weight_kg = v;
        }
        if (bodyFat.trim()) {
            const v = parseFloat(bodyFat);
            if (isNaN(v) || v < 0 || v > 100) {
                setError("체지방률을 다시 확인해주세요.");
                return;
            }
            input.body_fat_percent = v;
        }
        if (muscle.trim()) {
            const v = parseFloat(muscle);
            if (isNaN(v) || v < 0 || v > 200) {
                setError("근육량을 다시 확인해주세요.");
                return;
            }
            input.muscle_mass_kg = v;
        }
        if (bmi.trim()) {
            const v = parseFloat(bmi);
            if (isNaN(v) || v < 5 || v > 60) {
                setError("BMI를 다시 확인해주세요.");
                return;
            }
            input.bmi = v;
        }
        setSaving(true);
        try {
            const record = await submitInbody(input);
            onSaved(record);
            onClose();
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            keyboard
            maxHeight="80%"
        >
            <View style={mStyles.handle} />
            <View style={mStyles.header}>
                <Text style={mStyles.title}>인바디 측정 기록</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={colors.text3} />
                </Pressable>
            </View>
            <ScrollView
                style={mStyles.body}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={mStyles.label}>몸무게 (kg)</Text>
                <TextInput
                    style={mStyles.input}
                    value={weight}
                    onChangeText={(t) => {
                        setWeight(t);
                        setError(null);
                    }}
                    placeholder="예: 70.5"
                    placeholderTextColor={colors.text3}
                    keyboardType="decimal-pad"
                />
                <Text style={mStyles.label}>체지방률 (%)</Text>
                <TextInput
                    style={mStyles.input}
                    value={bodyFat}
                    onChangeText={(t) => {
                        setBodyFat(t);
                        setError(null);
                    }}
                    placeholder="예: 18.5"
                    placeholderTextColor={colors.text3}
                    keyboardType="decimal-pad"
                />
                <Text style={mStyles.label}>근육량 (kg)</Text>
                <TextInput
                    style={mStyles.input}
                    value={muscle}
                    onChangeText={(t) => {
                        setMuscle(t);
                        setError(null);
                    }}
                    placeholder="예: 35.2"
                    placeholderTextColor={colors.text3}
                    keyboardType="decimal-pad"
                />
                <Text style={mStyles.label}>BMI</Text>
                <TextInput
                    style={mStyles.input}
                    value={bmi}
                    onChangeText={(t) => {
                        setBmi(t);
                        setError(null);
                    }}
                    placeholder="예: 22.4"
                    placeholderTextColor={colors.text3}
                    keyboardType="decimal-pad"
                />
                {error ? <Text style={mStyles.errorText}>{error}</Text> : null}
                <View style={mStyles.footer}>
                    <Pressable
                        style={[
                            mStyles.saveBtn,
                            saving && mStyles.saveBtnDisabled,
                        ]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={mStyles.saveBtnText}>저장</Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </BottomSheet>
    );
}

// ── Profile 메인 화면 ──────────────────────────────────────────────────────────

type ModalType = "account" | "physical" | "sleep" | "routine" | "inbody" | null;

export default function Profile() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const signOut = useAuthStore((s) => s.signOut);

    const [notifSettings, setNotifSettings] =
        useState<NotificationSettings | null>(null);
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [latestInBody, setLatestInBody] = useState<InBodyRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [routineDay, setRoutineDay] = useState(0);
    const {
        debugMode,
        charState: debugCharState,
        energyLevel: debugEnergyLevel,
        growthLevel: debugGrowthLevel,
        setDebugMode,
        setCharState: setDebugCharState,
        setEnergyLevel: setDebugEnergyLevel,
        setGrowthLevel: setDebugGrowthLevel,
    } = useDebugStore();
    const [debugLoading, setDebugLoading] = useState<
        "pre" | "post" | "morning" | null
    >(null);
    const [healthSyncing, setHealthSyncing] = useState(false);
    const [healthResult, setHealthResult] = useState<string | null>(null);
    const [cacheClearing, setCacheClearing] = useState(false);
    const [cacheResult, setCacheResult] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetchMe().catch(() => null),
            fetchNotificationSettings().catch(() => null),
            fetchWorkoutPlans().catch(() => []),
            fetchInbodyHistory(1).catch(() => []),
        ]).then(([freshUser, ns, pl, ib]) => {
            if (freshUser) useAuthStore.getState().setUser(freshUser);
            if (ns) setNotifSettings(ns as NotificationSettings);
            setPlans((pl as WorkoutPlan[]) ?? []);
            const inbodyArr = (ib as InBodyRecord[]) ?? [];
            setLatestInBody(inbodyArr[0] ?? null);
            setLoading(false);
        });
    }, []);

    async function handleToggleNotif(
        key: keyof NotificationSettingsUpdate,
        value: boolean,
    ) {
        if (!notifSettings) return;
        const prev = notifSettings;
        setNotifSettings({ ...prev, [key]: value });
        try {
            await updateNotificationSettings({ [key]: value });
        } catch {
            setNotifSettings(prev);
        }
    }

    async function handleHealthSync() {
        setHealthSyncing(true);
        setHealthResult(null);
        try {
            await Promise.all([syncSleepData(), syncDailyMetrics()]);
            const [stats, sleep] = await Promise.all([
                fetchTodayHealthStats(),
                fetchSleepStats(1),
            ]);
            const sleepMin = sleep.avg_duration_minutes;
            const sleepStr = sleepMin
                ? `${Math.floor(sleepMin / 60)}시간 ${Math.round(sleepMin % 60)}분`
                : "없음";
            setHealthResult(
                `✅ Sync 완료\n` +
                    `수면: ${sleepStr}\n` +
                    `걸음수: ${stats.steps ?? "없음"}\n` +
                    `활동칼로리: ${stats.active_calories_kcal?.toFixed(0) ?? "없음"} kcal\n` +
                    `안정심박수: ${stats.resting_heart_rate_bpm?.toFixed(0) ?? "없음"} bpm\n` +
                    `평균심박수: ${stats.avg_heart_rate_bpm?.toFixed(0) ?? "없음"} bpm`,
            );
        } catch (e) {
            setHealthResult(
                `❌ 실패: ${e instanceof Error ? e.message : String(e)}`,
            );
        } finally {
            setHealthSyncing(false);
        }
    }

    async function handleDebugTrigger(type: "pre" | "post" | "morning") {
        setDebugLoading(type);
        try {
            const result = await triggerDebugNotification(type);
            const contextLines = Object.entries(result.context)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n");
            const typeLabel =
                type === "pre"
                    ? "운동 전 케어"
                    : type === "post"
                      ? "운동 후 케어"
                      : "아침 케어";
            Alert.alert(
                `[디버그] ${typeLabel}`,
                `📊 컨텍스트\n${contextLines}\n\n💬 Gemini 메시지\n${result.gemini_message}\n\n📲 FCM: ${result.fcm_sent ? `발송됨 (토큰 ${result.fcm_token_count}개)` : "토큰 없음"}`,
                [{ text: "확인" }],
            );
        } catch (e) {
            Alert.alert("오류", getApiErrorMessage(e));
        } finally {
            setDebugLoading(null);
        }
    }

    if (!user) return null;

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            {/* 모달 */}
            <AccountModal
                visible={activeModal === "account"}
                currentNickname={user.nickname}
                onClose={() => setActiveModal(null)}
            />
            <PhysicalModal
                visible={activeModal === "physical"}
                user={user}
                onClose={() => setActiveModal(null)}
            />
            <SleepModal
                visible={activeModal === "sleep"}
                user={user}
                onClose={() => setActiveModal(null)}
            />
            <RoutineModal
                visible={activeModal === "routine"}
                plans={plans}
                onClose={() => setActiveModal(null)}
                onSaved={(newPlans) => setPlans(newPlans)}
                initialDay={routineDay}
            />
            <InBodyModal
                visible={activeModal === "inbody"}
                onClose={() => setActiveModal(null)}
                onSaved={(record) => setLatestInBody(record)}
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
                    <Text style={styles.pageTitle}>프로필</Text>
                    <Text style={styles.subtitle}>
                        {user.nickname}님의 프로필
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator
                        color={colors.accent}
                        style={{ marginTop: 40 }}
                    />
                ) : (
                    <>
                        {/* 계정 */}
                        <Text style={styles.sectionHeader}>계정</Text>
                        <View style={styles.section}>
                            <ProfileRow
                                label="닉네임"
                                value={user.nickname}
                                onPress={() => setActiveModal("account")}
                                isLast
                            />
                        </View>

                        {/* 신체 정보 */}
                        <Text style={styles.sectionHeader}>신체 정보</Text>
                        <View style={styles.section}>
                            <ProfileRow
                                label="키"
                                value={
                                    user.height_cm
                                        ? `${user.height_cm} cm`
                                        : "—"
                                }
                                onPress={() => setActiveModal("physical")}
                            />
                            <ProfileRow
                                label="몸무게"
                                value={
                                    user.weight_kg
                                        ? `${user.weight_kg} kg`
                                        : "—"
                                }
                                onPress={() => setActiveModal("physical")}
                            />
                            <ProfileRow
                                label="숙련도"
                                value={FITNESS_LABEL[user.fitness_level]}
                                onPress={() => setActiveModal("physical")}
                                isLast
                            />
                        </View>

                        {/* 수면 목표 */}
                        <Text style={styles.sectionHeader}>수면 목표</Text>
                        <View style={styles.section}>
                            <ProfileRow
                                label="취침"
                                value={
                                    user.sleep_goal_bedtime
                                        ? utcTimeToLocal(
                                              user.sleep_goal_bedtime,
                                          )
                                        : "—"
                                }
                                onPress={() => setActiveModal("sleep")}
                            />
                            <ProfileRow
                                label="기상"
                                value={
                                    user.sleep_goal_wakeup
                                        ? utcTimeToLocal(user.sleep_goal_wakeup)
                                        : "—"
                                }
                                onPress={() => setActiveModal("sleep")}
                                isLast
                            />
                        </View>

                        {/* 운동 루틴 */}
                        <Text style={styles.sectionHeader}>운동 루틴</Text>
                        <View style={styles.section}>
                            {DAY_LABELS.map((dayLabel, i) => {
                                const plan = plans.find(
                                    (p) => p.day_of_week === i,
                                );
                                const parts = plan
                                    ? bodyPartsFromPlan(plan)
                                    : [];
                                return (
                                    <ProfileRow
                                        key={i}
                                        label={`${dayLabel}요일`}
                                        value={
                                            parts.length > 0
                                                ? parts
                                                      .map(bodyPartLabel)
                                                      .join(", ")
                                                : "휴식"
                                        }
                                        onPress={() => {
                                            setRoutineDay(i);
                                            setActiveModal("routine");
                                        }}
                                        isLast={i === 6}
                                    />
                                );
                            })}
                        </View>

                        {/* 인바디 */}
                        <Text style={styles.sectionHeader}>인바디</Text>
                        <View style={styles.section}>
                            {latestInBody ? (
                                <>
                                    <ProfileRow
                                        label="최근 측정일"
                                        value={new Date(
                                            latestInBody.measured_at,
                                        ).toLocaleDateString("ko-KR")}
                                    />
                                    <ProfileRow
                                        label="몸무게"
                                        value={
                                            latestInBody.weight_kg != null
                                                ? `${latestInBody.weight_kg} kg`
                                                : "—"
                                        }
                                    />
                                    <ProfileRow
                                        label="체지방률"
                                        value={
                                            latestInBody.body_fat_percent !=
                                            null
                                                ? `${latestInBody.body_fat_percent} %`
                                                : "—"
                                        }
                                    />
                                    <ProfileRow
                                        label="근육량"
                                        value={
                                            latestInBody.muscle_mass_kg != null
                                                ? `${latestInBody.muscle_mass_kg} kg`
                                                : "—"
                                        }
                                    />
                                    <ProfileRow
                                        label="BMI"
                                        value={
                                            latestInBody.bmi != null
                                                ? String(latestInBody.bmi)
                                                : "—"
                                        }
                                        isLast
                                    />
                                </>
                            ) : (
                                <ProfileRow
                                    label="측정 기록 없음"
                                    value="추가하기"
                                    onPress={() => setActiveModal("inbody")}
                                    isLast
                                />
                            )}
                        </View>
                        {latestInBody ? (
                            <Pressable
                                style={styles.addBtn}
                                onPress={() => setActiveModal("inbody")}
                            >
                                <Text style={styles.addBtnText}>
                                    + 새 측정 추가
                                </Text>
                            </Pressable>
                        ) : null}

                        {/* 알림 */}
                        {notifSettings ? (
                            <>
                                <Text style={styles.sectionHeader}>알림</Text>
                                <View style={styles.section}>
                                    <NotifRow
                                        label="운동 알림"
                                        value={notifSettings.workout_reminder}
                                        onToggle={(v) =>
                                            handleToggleNotif(
                                                "workout_reminder",
                                                v,
                                            )
                                        }
                                    />
                                    <NotifRow
                                        label="수면 알림"
                                        value={notifSettings.sleep_reminder}
                                        onToggle={(v) =>
                                            handleToggleNotif(
                                                "sleep_reminder",
                                                v,
                                            )
                                        }
                                    />
                                    <NotifRow
                                        label="친구 콕 찌르기"
                                        value={notifSettings.friend_poke}
                                        onToggle={(v) =>
                                            handleToggleNotif("friend_poke", v)
                                        }
                                    />
                                    <NotifRow
                                        label="성취 알림"
                                        value={notifSettings.achievement}
                                        onToggle={(v) =>
                                            handleToggleNotif("achievement", v)
                                        }
                                    />
                                    <NotifRow
                                        label="AI 코칭"
                                        value={notifSettings.ai_coaching}
                                        onToggle={(v) =>
                                            handleToggleNotif("ai_coaching", v)
                                        }
                                        isLast
                                    />
                                </View>
                            </>
                        ) : null}

                        {/* 로그아웃 */}
                        <Pressable
                            style={styles.logoutBtn}
                            onPress={() =>
                                Alert.alert(
                                    "로그아웃",
                                    "정말 로그아웃할까요?",
                                    [
                                        { text: "취소", style: "cancel" },
                                        {
                                            text: "로그아웃",
                                            style: "destructive",
                                            onPress: signOut,
                                        },
                                    ],
                                )
                            }
                        >
                            <Text style={styles.logoutText}>로그아웃</Text>
                        </Pressable>

                        {/* 시연용 디버그 모드 */}
                        <View style={styles.debugToggleRow}>
                            <Text style={styles.debugToggleLabel}>
                                시연용 디버그 모드
                            </Text>
                            <Switch
                                value={debugMode}
                                onValueChange={(v) => setDebugMode(v)}
                                trackColor={{
                                    false: colors.border,
                                    true: colors.accent,
                                }}
                                thumbColor="#FFFFFF"
                            />
                        </View>

                        {debugMode && (
                            <View style={styles.debugPanel}>
                                <Text style={styles.debugPanelTitle}>
                                    헬스 데이터 Sync
                                </Text>
                                <Text style={styles.debugPanelSub}>
                                    HealthKit에서 수면·걸음·심박수를 즉시 가져와
                                    백엔드에 저장합니다
                                </Text>
                                <Pressable
                                    style={[
                                        styles.debugBtn,
                                        healthSyncing && styles.debugBtnLoading,
                                    ]}
                                    onPress={handleHealthSync}
                                    disabled={healthSyncing}
                                >
                                    {healthSyncing ? (
                                        <ActivityIndicator
                                            color="#FFFFFF"
                                            size="small"
                                        />
                                    ) : (
                                        <Text style={styles.debugBtnText}>
                                            헬스 데이터 강제 가져오기
                                        </Text>
                                    )}
                                </Pressable>
                                {healthResult && (
                                    <Text style={styles.debugResultText}>
                                        {healthResult}
                                    </Text>
                                )}

                                <Text
                                    style={[
                                        styles.debugPanelTitle,
                                        { marginTop: 16 },
                                    ]}
                                >
                                    Gemini 알림 즉시 트리거
                                </Text>
                                <Text style={styles.debugPanelSub}>
                                    스케줄러 없이 현재 데이터 기반 메시지를 즉시
                                    생성·발송합니다
                                </Text>

                                {(
                                    [
                                        { type: "morning", label: "아침 케어" },
                                        { type: "pre", label: "운동 전 케어" },
                                        { type: "post", label: "운동 후 케어" },
                                    ] as const
                                ).map(({ type, label }) => (
                                    <Pressable
                                        key={type}
                                        style={[
                                            styles.debugBtn,
                                            debugLoading === type &&
                                                styles.debugBtnLoading,
                                        ]}
                                        onPress={() => handleDebugTrigger(type)}
                                        disabled={debugLoading !== null}
                                    >
                                        {debugLoading === type ? (
                                            <ActivityIndicator
                                                color="#FFFFFF"
                                                size="small"
                                            />
                                        ) : (
                                            <Text style={styles.debugBtnText}>
                                                {label}
                                            </Text>
                                        )}
                                    </Pressable>
                                ))}

                                <Text
                                    style={[
                                        styles.debugPanelTitle,
                                        { marginTop: 16 },
                                    ]}
                                >
                                    Gemini 캐시
                                </Text>
                                <Text style={styles.debugPanelSub}>
                                    저장된 케어 메시지를 지웁니다. 앱 재접 시
                                    백엔드에 새로 요청합니다.
                                </Text>
                                <Pressable
                                    style={[
                                        styles.debugBtn,
                                        cacheClearing &&
                                            styles.debugBtnLoading,
                                    ]}
                                    onPress={async () => {
                                        setCacheClearing(true);
                                        setCacheResult(null);
                                        try {
                                            await clearCareCache();
                                            setCacheResult("✓ 캐시 삭제 완료");
                                        } catch {
                                            setCacheResult("✗ 삭제 실패");
                                        } finally {
                                            setCacheClearing(false);
                                        }
                                    }}
                                    disabled={cacheClearing}
                                >
                                    {cacheClearing ? (
                                        <ActivityIndicator
                                            color="#FFFFFF"
                                            size="small"
                                        />
                                    ) : (
                                        <Text style={styles.debugBtnText}>
                                            캐시 지우기
                                        </Text>
                                    )}
                                </Pressable>
                                {cacheResult && (
                                    <Text style={styles.debugResultText}>
                                        {cacheResult}
                                    </Text>
                                )}

                                <Text
                                    style={[
                                        styles.debugPanelTitle,
                                        { marginTop: 16 },
                                    ]}
                                >
                                    캐릭터 상태 미리보기
                                </Text>
                                <Text style={styles.debugPanelSub}>
                                    9가지 상태와 에너지 레벨(0–6)이 캐릭터에
                                    어떻게 반영되는지 확인합니다
                                </Text>
                                <View style={styles.debugCharWrap}>
                                    <PixelCharacter
                                        state={debugCharState}
                                        options={{
                                            energyLevel: debugEnergyLevel,
                                            growthLevel: debugGrowthLevel,
                                        }}
                                        cellSize={CELL_SIZE.card}
                                    />
                                </View>
                                <View style={styles.debugChipRow}>
                                    {DEBUG_CHARACTER_STATES.map(
                                        ({ state, label }) => (
                                            <Pressable
                                                key={state}
                                                style={[
                                                    styles.debugChip,
                                                    debugCharState === state &&
                                                        styles.debugChipActive,
                                                ]}
                                                onPress={() =>
                                                    setDebugCharState(state)
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.debugChipText,
                                                        debugCharState ===
                                                            state &&
                                                            styles.debugChipTextActive,
                                                    ]}
                                                >
                                                    {label}
                                                </Text>
                                            </Pressable>
                                        ),
                                    )}
                                </View>
                                <Text
                                    style={[
                                        styles.debugPanelSub,
                                        { marginTop: 8 },
                                    ]}
                                >
                                    에너지 레벨 (수면+루틴 평균 → 몸 색상)
                                </Text>
                                <View style={styles.debugEnergyRow}>
                                    {(
                                        [0, 1, 2, 3, 4, 5, 6] as EnergyLevel[]
                                    ).map((lvl) => (
                                        <Pressable
                                            key={lvl}
                                            style={[
                                                styles.debugEnergyBtn,
                                                debugEnergyLevel === lvl &&
                                                    styles.debugEnergyBtnActive,
                                            ]}
                                            onPress={() =>
                                                setDebugEnergyLevel(lvl)
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.debugEnergyBtnText,
                                                    debugEnergyLevel === lvl &&
                                                        styles.debugEnergyBtnTextActive,
                                                ]}
                                            >
                                                {lvl}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                                <Text
                                    style={[
                                        styles.debugPanelSub,
                                        { marginTop: 8 },
                                    ]}
                                >
                                    성장 레벨 (character_level → 캐릭터
                                    크기·형태)
                                </Text>
                                <View style={styles.debugEnergyRow}>
                                    {([1, 2, 3, 4, 5] as GrowthLevel[]).map(
                                        (lvl) => (
                                            <Pressable
                                                key={lvl}
                                                style={[
                                                    styles.debugEnergyBtn,
                                                    debugGrowthLevel === lvl &&
                                                        styles.debugEnergyBtnActive,
                                                ]}
                                                onPress={() =>
                                                    setDebugGrowthLevel(lvl)
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.debugEnergyBtnText,
                                                        debugGrowthLevel ===
                                                            lvl &&
                                                            styles.debugEnergyBtnTextActive,
                                                    ]}
                                                >
                                                    {lvl}
                                                </Text>
                                            </Pressable>
                                        ),
                                    )}
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
            <LinearGradient
                colors={[colors.bg, colors.bg, "rgba(242,242,247,0)"]}
                locations={[0, insets.top / (insets.top + 44), 1]}
                style={[styles.topFade, { height: insets.top + 44 }]}
                pointerEvents="none"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    topFade: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16 },

    header: { paddingTop: 40, paddingBottom: 24 },
    pageTitle: {
        fontSize: fontSize.largeTitle,
        lineHeight: 41,
        fontWeight: fontWeight.bold,
        color: colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: fontSize.subhead,
        lineHeight: 20,
        color: colors.text3,
        marginTop: 4,
    },

    sectionHeader: {
        fontSize: fontSize.footnote,
        fontWeight: fontWeight.semibold,
        color: colors.text3,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 20,
        marginLeft: 4,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(0,0,0,0.06)",
    },

    addBtn: {
        alignItems: "center",
        paddingVertical: 10,
    },
    addBtnText: {
        color: colors.accent,
        fontSize: fontSize.subhead,
        fontWeight: fontWeight.medium,
    },

    logoutBtn: {
        marginTop: 32,
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(0,0,0,0.06)",
    },
    logoutText: {
        color: colors.red,
        fontSize: fontSize.body,
        fontWeight: fontWeight.semibold,
    },

    debugToggleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 32,
        paddingLeft: 4,
        paddingRight: 22,
    },
    debugToggleLabel: {
        fontSize: fontSize.footnote,
        color: colors.text3,
        fontWeight: fontWeight.medium,
    },
    debugPanel: {
        marginTop: 16,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(0,0,0,0.06)",
        gap: 10,
    },
    debugPanelTitle: {
        fontSize: fontSize.callout,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    debugPanelSub: {
        fontSize: fontSize.caption1,
        color: colors.text3,
        marginBottom: 4,
    },
    debugBtn: {
        backgroundColor: colors.accent,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
    },
    debugBtnLoading: {
        opacity: 0.6,
    },
    debugBtnText: {
        color: "#FFFFFF",
        fontSize: fontSize.callout,
        fontWeight: fontWeight.semibold,
    },
    debugResultText: {
        marginTop: 10,
        fontSize: fontSize.footnote,
        color: colors.text2,
        lineHeight: 20,
    },
    debugCharWrap: {
        alignItems: "center",
        paddingVertical: 8,
    },
    debugChipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    debugChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.bg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    debugChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    debugChipText: {
        fontSize: fontSize.caption,
        color: colors.text2,
        fontWeight: fontWeight.medium,
    },
    debugChipTextActive: {
        color: "#FFFFFF",
    },
    debugEnergyRow: {
        flexDirection: "row",
        gap: 6,
    },
    debugEnergyBtn: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.bg,
        alignItems: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    debugEnergyBtnActive: {
        backgroundColor: colors.accentOrange,
        borderColor: colors.accentOrange,
    },
    debugEnergyBtnText: {
        fontSize: fontSize.caption,
        color: colors.text2,
        fontWeight: fontWeight.medium,
    },
    debugEnergyBtnTextActive: {
        color: "#FFFFFF",
    },
});
