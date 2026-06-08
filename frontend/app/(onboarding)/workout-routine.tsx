import { useEffect, useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/constants/colors";
import { fontSize, fontWeight } from "@/constants/typography";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { BodyPart, Weekday } from "@/types";

const DAYS: { key: Weekday; label: string }[] = [
    { key: "mon", label: "월" },
    { key: "tue", label: "화" },
    { key: "wed", label: "수" },
    { key: "thu", label: "목" },
    { key: "fri", label: "금" },
    { key: "sat", label: "토" },
    { key: "sun", label: "일" },
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

const DAY_FULL: Record<Weekday, string> = {
    mon: "월요일",
    tue: "화요일",
    wed: "수요일",
    thu: "목요일",
    fri: "금요일",
    sat: "토요일",
    sun: "일요일",
};

const TOTAL_STEPS = 5;

const DRUM_ITEM_H = 52;
const DRUM_VISIBLE = 3;
const DRUM_HALF = Math.floor(DRUM_VISIBLE / 2);
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
    String(i * 5).padStart(2, "0"),
);

function parseTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    return { hour: h ?? 0, minuteIdx: Math.round((m ?? 0) / 5) };
}

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
    outer: { height: DRUM_ITEM_H * DRUM_VISIBLE, overflow: "hidden", flex: 1 },
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

function StepDots({ current }: { current: number }) {
    return (
        <View style={dotStyles.row}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <View
                    key={i}
                    style={[
                        dotStyles.dot,
                        i === current - 1
                            ? dotStyles.active
                            : dotStyles.inactive,
                    ]}
                />
            ))}
        </View>
    );
}
const dotStyles = StyleSheet.create({
    row: { flexDirection: "row", gap: 6 },
    dot: { height: 6, borderRadius: 3 },
    active: { width: 20, backgroundColor: colors.accent },
    inactive: { width: 6, backgroundColor: colors.border },
});

export default function WorkoutRoutine() {
    const router = useRouter();
    const { routines, toggleBodyPart, setPlannedTime } = useOnboardingStore();
    const [selectedDay, setSelectedDay] = useState<Weekday>("mon");

    const currentRoutine = routines.find((r) => r.day === selectedDay)!;
    const hasSchedule = (day: Weekday) =>
        (routines.find((r) => r.day === day)?.bodyParts.length ?? 0) > 0;

    const plannedTime = currentRoutine.planned_time ?? null;
    const timeEnabled = plannedTime !== null;
    const { hour: drumHour, minuteIdx: drumMinuteIdx } = parseTime(
        plannedTime ?? "18:00",
    );

    function handleTimeToggle(enabled: boolean) {
        setPlannedTime(selectedDay, enabled ? "18:00" : null);
    }
    function handleHourChange(i: number) {
        const h = String(i).padStart(2, "0");
        const m = String(drumMinuteIdx * 5).padStart(2, "0");
        setPlannedTime(selectedDay, `${h}:${m}`);
    }
    function handleMinChange(i: number) {
        const h = String(drumHour).padStart(2, "0");
        const m = String(i * 5).padStart(2, "0");
        setPlannedTime(selectedDay, `${h}:${m}`);
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.root}>
                <View style={styles.header}>
                    <StepDots current={1} />
                    <Text style={styles.title}>운동 루틴 설정</Text>
                    <Text style={styles.subtitle}>
                        운동할 요일과 부위를 선택해주세요
                    </Text>
                </View>

                <View style={styles.dayRow}>
                    {DAYS.map(({ key, label }) => {
                        const isSelected = selectedDay === key;
                        const scheduled = hasSchedule(key);
                        return (
                            <Pressable
                                key={key}
                                onPress={() => setSelectedDay(key)}
                                style={[
                                    styles.dayChip,
                                    isSelected
                                        ? styles.dayChipSelected
                                        : scheduled
                                          ? styles.dayChipScheduled
                                          : styles.dayChipEmpty,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.dayChipText,
                                        isSelected
                                            ? styles.dayChipTextSelected
                                            : scheduled
                                              ? styles.dayChipTextScheduled
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
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Text style={styles.sectionLabel}>
                        {DAY_FULL[selectedDay]}의 운동 루틴
                    </Text>
                    <View style={styles.partGrid}>
                        {BODY_PARTS.map(({ key, label }) => {
                            const selected =
                                currentRoutine.bodyParts.includes(key);
                            return (
                                <Pressable
                                    key={key}
                                    style={[
                                        styles.partChip,
                                        selected && styles.partChipSelected,
                                    ]}
                                    onPress={() =>
                                        toggleBodyPart(selectedDay, key)
                                    }
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                >
                                    <Text
                                        style={[
                                            styles.partChipText,
                                            selected &&
                                                styles.partChipTextSelected,
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* 운동 예정 시각 */}
                    <View style={styles.timeSection}>
                        <View style={styles.timeHeaderRow}>
                            <Text style={styles.sectionLabel} numberOfLines={1}>
                                운동 예정 시각
                            </Text>
                            <Switch
                                value={timeEnabled}
                                onValueChange={handleTimeToggle}
                                trackColor={{ true: colors.accent }}
                            />
                        </View>
                        {timeEnabled && (
                            <View
                                key={`drum-${selectedDay}`}
                                style={styles.pickerCard}
                            >
                                <View style={styles.drumsRow}>
                                    <TimeDrum
                                        values={HOURS}
                                        initialIndex={drumHour}
                                        onChange={handleHourChange}
                                    />
                                    <Text style={styles.colon}>:</Text>
                                    <TimeDrum
                                        values={MINUTES}
                                        initialIndex={drumMinuteIdx}
                                        onChange={handleMinChange}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>

                <View style={styles.bottomAction}>
                    <View style={styles.bottomRow}>
                        <Pressable
                            style={styles.backBtn}
                            onPress={() => router.replace("/(auth)/login")}
                        >
                            <Ionicons name="chevron-back" size={22} color={colors.text} />
                        </Pressable>
                        <Pressable
                            style={styles.button}
                            onPress={() => router.push("/(onboarding)/sleep-goal")}
                        >
                            <Text style={styles.buttonText}>다음</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.white },
    root: { flex: 1 },
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
    title: {
        fontSize: fontSize.largeTitle,
        fontWeight: "900",
        color: colors.text,
        letterSpacing: -0.5,
        marginTop: 16,
        marginBottom: 4,
    },
    subtitle: { fontSize: fontSize.subhead, color: colors.text2 },
    dayRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 6,
        marginBottom: 8,
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
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
    sectionLabel: {
        fontSize: fontSize.headline,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: 16,
    },
    partGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    timeSection: { marginTop: 24 },
    timeHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        paddingRight: 10,
    },
    pickerCard: {
        backgroundColor: colors.bg,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 8,
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
    bottomAction: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        backgroundColor: colors.white,
    },
    bottomRow: { flexDirection: "row", gap: 10 },
    backBtn: {
        width: 52,
        borderRadius: 12,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
    },
    button: {
        flex: 1,
        backgroundColor: colors.accent,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
    },
    buttonText: {
        color: colors.white,
        fontSize: fontSize.headline,
        fontWeight: fontWeight.semibold,
    },
});
