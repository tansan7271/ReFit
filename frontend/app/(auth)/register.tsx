import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/constants/colors";
import { fontSize, fontWeight } from "@/constants/typography";
import { getApiErrorMessage, register } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { Gender } from "@/types";

const GENDER_OPTIONS = [
    { label: "남성", value: "male" },
    { label: "여성", value: "female" },
    { label: "선택 안 함", value: "other" },
] as const satisfies readonly { label: string; value: Gender }[];

const GOAL_OPTIONS = [
    { label: "근력 향상", value: "strength" },
    { label: "체중 감량", value: "weight_loss" },
    { label: "체력 유지", value: "endurance" },
    { label: "체형 관리", value: "body_composition" },
] as const;

type GoalValue = (typeof GOAL_OPTIONS)[number]["value"];

export default function Register() {
    const router = useRouter();
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState<Gender | null>(null);
    const [goal, setGoal] = useState<GoalValue | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [goalSheetVisible, setGoalSheetVisible] = useState(false);
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const sheetTranslate = useRef(new Animated.Value(400)).current;

    const openGoalSheet = () => {
        setGoalSheetVisible(true);
        Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.spring(sheetTranslate, { toValue: 0, tension: 68, friction: 11, useNativeDriver: true }),
        ]).start();
    };

    const closeGoalSheet = () => {
        Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(sheetTranslate, { toValue: 400, duration: 220, useNativeDriver: true }),
        ]).start(() => setGoalSheetVisible(false));
    };

    const validate = (): string | null => {
        if (
            !nickname.trim() ||
            !email.trim() ||
            !password ||
            !passwordConfirm ||
            !age.trim() ||
            !gender ||
            !goal
        ) {
            return "모든 항목을 입력해 주세요.";
        }
        if (password !== passwordConfirm) {
            return "비밀번호가 일치하지 않습니다.";
        }
        const ageNum = Number(age);
        if (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120) {
            return "나이는 1~120 사이로 입력해 주세요.";
        }
        return null;
    };

    const handleRegister = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const session = await register(
                email.trim(),
                password,
                nickname.trim(),
            );
            await useAuthStore
                .getState()
                .setSession(
                    session.accessToken,
                    session.refreshToken,
                    session.user,
                );

            useOnboardingStore
                .getState()
                .setPersonalInfo(Number(age), gender as Gender);
            useOnboardingStore
                .getState()
                .setCharacterInfo("🐣", goal as GoalValue);

            router.replace("/(onboarding)/workout-routine");
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.pageTitle}>환영합니다 👋</Text>
                    <Text style={styles.pageSubtitle}>
                        기능 제공을 위해 필요한 정보를 입력해주세요
                    </Text>

                    <View style={styles.fields}>
                        <TextInput
                            style={styles.input}
                            placeholder="닉네임"
                            placeholderTextColor={colors.text3}
                            value={nickname}
                            onChangeText={setNickname}
                            autoCapitalize="none"
                            accessibilityLabel="닉네임 입력"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="이메일"
                            placeholderTextColor={colors.text3}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            accessibilityLabel="이메일 입력"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="비밀번호"
                            placeholderTextColor={colors.text3}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            accessibilityLabel="비밀번호 입력"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="비밀번호 확인"
                            placeholderTextColor={colors.text3}
                            value={passwordConfirm}
                            onChangeText={setPasswordConfirm}
                            secureTextEntry
                            autoCapitalize="none"
                            accessibilityLabel="비밀번호 확인 입력"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="나이"
                            placeholderTextColor={colors.text3}
                            value={age}
                            onChangeText={setAge}
                            keyboardType="numeric"
                            accessibilityLabel="나이 입력"
                        />
                    </View>

                    <Text style={styles.sectionLabel}>성별</Text>
                    <View style={styles.segmentControl}>
                        {GENDER_OPTIONS.map((opt) => {
                            const selected = gender === opt.value;
                            return (
                                <Pressable
                                    key={opt.value}
                                    style={[
                                        styles.segmentItem,
                                        selected && styles.segmentItemSelected,
                                    ]}
                                    onPress={() => setGender(opt.value)}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                    accessibilityLabel={`성별 ${opt.label}`}
                                >
                                    <Text
                                        style={[
                                            styles.segmentText,
                                            selected &&
                                                styles.segmentTextSelected,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Text style={styles.sectionLabel}>운동 목표</Text>
                    <Pressable
                        style={styles.dropdownRow}
                        onPress={openGoalSheet}
                        accessibilityRole="button"
                        accessibilityLabel="운동 목표 선택"
                    >
                        <Text style={[styles.dropdownText, !goal && styles.dropdownPlaceholder]}>
                            {goal ? GOAL_OPTIONS.find((o) => o.value === goal)?.label : "선택하세요"}
                        </Text>
                        <Text style={styles.dropdownChevron}>›</Text>
                    </Pressable>

                    <Modal
                        visible={goalSheetVisible}
                        transparent
                        animationType="none"
                        onRequestClose={closeGoalSheet}
                    >
                        <View style={styles.sheetRoot}>
                            <Animated.View style={[styles.sheetOverlay, { opacity: overlayOpacity }]}>
                                <Pressable style={StyleSheet.absoluteFill} onPress={closeGoalSheet} />
                            </Animated.View>
                            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
                                <View style={styles.sheetHandle} />
                                <Text style={styles.sheetTitle}>운동 목표</Text>
                                <View style={styles.sheetOptions}>
                                    {GOAL_OPTIONS.map((opt) => {
                                        const selected = goal === opt.value;
                                        return (
                                            <Pressable
                                                key={opt.value}
                                                style={[styles.sheetRow, selected && styles.sheetRowSelected]}
                                                onPress={() => { setGoal(opt.value); closeGoalSheet(); }}
                                                accessibilityRole="button"
                                                accessibilityState={{ selected }}
                                            >
                                                <Text style={[styles.sheetRowText, selected && styles.sheetRowTextSelected]}>
                                                    {opt.label}
                                                </Text>
                                                {selected && <Text style={styles.sheetCheck}>✓</Text>}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </Animated.View>
                        </View>
                    </Modal>

                    {error ? <Text style={styles.error}>{error}</Text> : null}
                </ScrollView>

                <View style={styles.bottomAction}>
                    <Pressable
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="회원가입"
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.buttonText}>회원가입</Text>
                        )}
                    </Pressable>

                    <Pressable
                        style={styles.linkRow}
                        onPress={() => router.replace("/(auth)/login")}
                        accessibilityRole="link"
                        accessibilityLabel="로그인으로 이동"
                    >
                        <Text style={styles.linkText}>
                            이미 계정이 있으신가요?{" "}
                        </Text>
                        <Text style={styles.linkAccent}>로그인</Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.white,
    },
    flex: {
        flex: 1,
    },
    scroll: {
        paddingHorizontal: 16,
        paddingVertical: 32,
    },
    pageTitle: {
        fontSize: fontSize.largeTitle,
        fontWeight: "900",
        color: colors.text,
        textAlign: "left",
        marginBottom: 4,
        paddingTop: 8,
        letterSpacing: -0.5,
    },
    pageSubtitle: {
        fontSize: fontSize.subhead,
        fontWeight: "300",
        color: colors.text2,
        marginBottom: 24,
    },
    fields: {
        gap: 8,
    },
    input: {
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: fontSize.body,
        color: colors.text,
    },
    sectionLabel: {
        fontSize: fontSize.subhead,
        fontWeight: fontWeight.semibold,
        color: colors.text2,
        marginTop: 28,
        marginBottom: 12,
    },
    segmentControl: {
        flexDirection: "row",
        backgroundColor: colors.bg,
        borderRadius: 10,
        padding: 2,
    },
    segmentItem: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    segmentItemSelected: {
        backgroundColor: colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: fontSize.subhead,
        color: colors.text2,
    },
    segmentTextSelected: {
        color: colors.text,
        fontWeight: fontWeight.semibold,
    },
    dropdownRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dropdownText: {
        fontSize: fontSize.body,
        color: colors.text,
    },
    dropdownPlaceholder: {
        color: colors.text3,
    },
    dropdownChevron: {
        fontSize: 22,
        color: colors.text3,
        lineHeight: 24,
    },
    sheetRoot: {
        flex: 1,
        justifyContent: "flex-end",
    },
    sheetOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: "center",
        marginTop: 12,
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: fontSize.headline,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    sheetOptions: {
        paddingHorizontal: 16,
        gap: 8,
    },
    sheetRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    sheetRowSelected: {
        backgroundColor: colors.accent,
    },
    sheetRowText: {
        fontSize: fontSize.body,
        color: colors.text,
    },
    sheetRowTextSelected: {
        color: colors.white,
        fontWeight: fontWeight.semibold,
    },
    sheetCheck: {
        fontSize: fontSize.body,
        color: colors.white,
        fontWeight: fontWeight.semibold,
    },
    error: {
        color: colors.red,
        fontSize: fontSize.subhead,
        marginTop: 20,
    },
    bottomAction: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        backgroundColor: colors.white,
    },
    button: {
        backgroundColor: colors.accent,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.white,
        fontSize: fontSize.headline,
        fontWeight: fontWeight.semibold,
    },
    linkRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 24,
    },
    linkText: {
        color: colors.text3,
        fontSize: fontSize.subhead,
    },
    linkAccent: {
        color: colors.accent,
        fontSize: fontSize.subhead,
        fontWeight: fontWeight.semibold,
    },
});
