import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/constants/colors";
import { fontSize, fontWeight } from "@/constants/typography";
import { useOnboardingStore } from "@/store/onboardingStore";

const TOTAL_STEPS = 5;
const DRUM_ITEM_H = 52;
const DRUM_VISIBLE = 3;
const DRUM_HALF = Math.floor(DRUM_VISIBLE / 2);

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
    String(i * 5).padStart(2, "0"),
);

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

function parseTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    return { hour: h, minuteIdx: Math.round(m / 5) };
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

export default function SleepGoal() {
    const router = useRouter();
    const { sleepGoal, setSleepGoal } = useOnboardingStore();
    const [error, setError] = useState<string | null>(null);

    const initBed = parseTime(sleepGoal.bedTime);
    const initWake = parseTime(sleepGoal.wakeTime);

    const [bedHour, setBedHour] = useState(initBed.hour);
    const [bedMinuteIdx, setBedMinuteIdx] = useState(initBed.minuteIdx);
    const [wakeHour, setWakeHour] = useState(initWake.hour);
    const [wakeMinuteIdx, setWakeMinuteIdx] = useState(initWake.minuteIdx);

    const handleNext = () => {
        const bedMins = bedHour * 60 + bedMinuteIdx * 5;
        const wakeMins = wakeHour * 60 + wakeMinuteIdx * 5;
        if (bedMins === wakeMins) {
            setError("취침 시간과 기상 시간이 같을 수 없어요.");
            return;
        }
        setError(null);
        const bedTime = `${String(bedHour).padStart(2, "0")}:${String(bedMinuteIdx * 5).padStart(2, "0")}`;
        const wakeTime = `${String(wakeHour).padStart(2, "0")}:${String(wakeMinuteIdx * 5).padStart(2, "0")}`;
        setSleepGoal({ bedTime, wakeTime });
        router.push("/(onboarding)/physical-profile");
    };

    const duration = calcSleepDuration(
        bedHour,
        bedMinuteIdx,
        wakeHour,
        wakeMinuteIdx,
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.root}>
                <View style={styles.header}>
                    <StepDots current={2} />
                    <Text style={styles.title}>수면 목표 설정</Text>
                    <Text style={styles.subtitle}>
                        건강한 수면 습관을 만들어봐요
                    </Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerLabel}>취침</Text>
                        <View style={styles.drumsRow}>
                            <TimeDrum
                                values={HOURS}
                                initialIndex={bedHour}
                                onChange={setBedHour}
                            />
                            <Text style={styles.colon}>:</Text>
                            <TimeDrum
                                values={MINUTES}
                                initialIndex={bedMinuteIdx}
                                onChange={setBedMinuteIdx}
                            />
                        </View>
                    </View>

                    <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>
                            ∙∙∙ 총 수면 {duration} ∙∙∙
                        </Text>
                    </View>

                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerLabel}>기상</Text>
                        <View style={styles.drumsRow}>
                            <TimeDrum
                                values={HOURS}
                                initialIndex={wakeHour}
                                onChange={setWakeHour}
                            />
                            <Text style={styles.colon}>:</Text>
                            <TimeDrum
                                values={MINUTES}
                                initialIndex={wakeMinuteIdx}
                                onChange={setWakeMinuteIdx}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.bottomAction}>
                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}
                    <View style={styles.bottomRow}>
                        <Pressable
                            style={styles.backBtn}
                            onPress={() => router.back()}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={22}
                                color={colors.text2}
                            />
                        </Pressable>
                        <Pressable style={styles.button} onPress={handleNext}>
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
    content: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 16,
        gap: 12,
    },
    pickerCard: {
        backgroundColor: colors.bg,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    pickerLabel: {
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
    bottomAction: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        backgroundColor: colors.white,
    },
    errorText: {
        color: colors.red,
        fontSize: fontSize.subhead,
        textAlign: "center",
        marginBottom: 8,
    },
    bottomRow: { flexDirection: "row", gap: 10 },
    backBtn: {
        width: 52,
        borderRadius: 12,
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
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
