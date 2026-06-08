import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "@/constants/colors";
import { fontSize, fontWeight } from "@/constants/typography";
import {
    acceptFriendRequest,
    fetchFriends,
    fetchPendingRequests,
    fetchReceivedPokes,
    fetchSentRequestUserIds,
    getApiErrorMessage,
    removeFriend,
    searchUsers,
    sendFriendRequest,
    sendPoke,
} from "@/services/api";
import type {
    Friend,
    PendingFriendRequest,
    Poke,
    SearchRelationStatus,
    UserSearchResult,
} from "@/types";

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

const LEVEL_COLOR = ['#c0dcf4', '#88b8ec', '#c4b4ec', '#f4a888', '#f8cc40'] as const;

function BadgeCircle({ badgeName, level }: { badgeName: string | null; level: number }) {
    const idx = Math.max(0, Math.min(4, Math.round(level) - 1));
    return (
        <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: LEVEL_COLOR[idx],
            alignItems: "center", justifyContent: "center",
            marginRight: 12,
        }}>
            {badgeName && (
                <Ionicons name={BADGE_ICON[badgeName] ?? "medal-outline"} size={23} color="rgba(0,0,0,0.45)" />
            )}
        </View>
    );
}

// ── BottomSheet ────────────────────────────────────────────────────────────────

function BottomSheet({
    visible,
    onClose,
    children,
}: {
    visible: boolean;
    onClose: () => void;
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

    return (
        <Modal
            visible={mounted}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: "rgba(0,0,0,0.4)", opacity },
                ]}
            >
                <Pressable style={{ flex: 1 }} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <Animated.View
                        style={[
                            sheetStyles.sheet,
                            { transform: [{ translateY: ty }] },
                        ]}
                    >
                        {children}
                    </Animated.View>
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>
    );
}

const sheetStyles = StyleSheet.create({
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
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
        paddingBottom: 8,
    },
    label: {
        fontSize: fontSize.subhead,
        fontWeight: fontWeight.semibold,
        color: colors.text2,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: fontSize.body,
        color: colors.text,
    },
    errorText: {
        color: colors.red,
        fontSize: fontSize.subhead,
        textAlign: "center",
        marginTop: 10,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 10,
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
});

// ── AddFriendSheet ─────────────────────────────────────────────────────────────

function AddFriendSheet({
    visible,
    onClose,
    onAdded,
    friendUserIds,
    sentUserIds,
    pendingFromUserIds,
}: {
    visible: boolean;
    onClose: () => void;
    onAdded: () => void;
    friendUserIds: Set<number>;
    sentUserIds: Set<number>;
    pendingFromUserIds: Set<number>;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [requestingId, setRequestingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setQuery("");
            setResults([]);
            setError(null);
        }
    }, [visible]);

    function getRelation(userId: number): SearchRelationStatus {
        if (friendUserIds.has(userId)) return "accepted";
        if (sentUserIds.has(userId)) return "pending_sent";
        if (pendingFromUserIds.has(userId)) return "pending_received";
        return "none";
    }

    async function handleSearch() {
        if (!query.trim()) return;
        setSearching(true);
        setError(null);
        try {
            const found = await searchUsers(query.trim());
            setResults(found);
            if (found.length === 0) setError("검색 결과가 없어요");
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setSearching(false);
        }
    }

    async function handleRequest(user: UserSearchResult) {
        setRequestingId(user.user_id);
        setError(null);
        try {
            await sendFriendRequest(user.user_id);
            onAdded();
            onClose();
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setRequestingId(null);
        }
    }

    return (
        <BottomSheet visible={visible} onClose={onClose}>
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.header}>
                <Text style={sheetStyles.title}>친구 추가</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={colors.text3} />
                </Pressable>
            </View>
            <View style={sheetStyles.body}>
                <Text style={sheetStyles.label}>닉네임 검색</Text>
                <View style={addStyles.searchRow}>
                    <TextInput
                        style={[sheetStyles.input, { flex: 1 }]}
                        value={query}
                        onChangeText={(t) => {
                            setQuery(t);
                            setError(null);
                        }}
                        placeholder="닉네임을 입력하세요"
                        placeholderTextColor={colors.text3}
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                    />
                    <Pressable
                        style={[
                            addStyles.searchBtn,
                            searching && sheetStyles.saveBtnDisabled,
                        ]}
                        onPress={handleSearch}
                        disabled={searching}
                    >
                        {searching ? (
                            <ActivityIndicator
                                color={colors.white}
                                size="small"
                            />
                        ) : (
                            <Ionicons
                                name="search"
                                size={18}
                                color={colors.white}
                            />
                        )}
                    </Pressable>
                </View>

                {error ? (
                    <Text style={sheetStyles.errorText}>{error}</Text>
                ) : null}

                {results.length > 0 && (
                    <View style={addStyles.resultList}>
                        {results.map((user, i) => {
                            const relation = getRelation(user.user_id);
                            return (
                                <View
                                    key={user.user_id}
                                    style={[
                                        addStyles.resultRow,
                                        i < results.length - 1 && {
                                            borderBottomWidth:
                                                StyleSheet.hairlineWidth,
                                            borderBottomColor:
                                                colors.separator,
                                        },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={addStyles.resultName}>
                                            {user.nickname}
                                        </Text>
                                        <Text style={addStyles.resultLevel}>
                                            Lv.{user.character_level}
                                        </Text>
                                    </View>
                                    <RelationChip
                                        relation={relation}
                                        loading={
                                            requestingId === user.user_id
                                        }
                                        onPress={
                                            relation === "none"
                                                ? () => handleRequest(user)
                                                : undefined
                                        }
                                    />
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        </BottomSheet>
    );
}

function RelationChip({
    relation,
    loading,
    onPress,
}: {
    relation: SearchRelationStatus;
    loading: boolean;
    onPress?: () => void;
}) {
    const configs: Record<
        SearchRelationStatus,
        { label: string; bg: string; color: string }
    > = {
        none: { label: "요청", bg: colors.accent, color: colors.white },
        pending_sent: {
            label: "요청됨",
            bg: colors.bg,
            color: colors.text3,
        },
        pending_received: {
            label: "받은 요청",
            bg: "#E8F5E9",
            color: "#2E7D32",
        },
        accepted: { label: "친구 ✓", bg: colors.bg, color: colors.text3 },
    };
    const cfg = configs[relation];

    return (
        <Pressable
            style={[
                addStyles.chip,
                { backgroundColor: cfg.bg },
                (!onPress || loading) && { opacity: 0.7 },
            ]}
            onPress={onPress}
            disabled={!onPress || loading}
        >
            {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
            ) : (
                <Text style={[addStyles.chipText, { color: cfg.color }]}>
                    {cfg.label}
                </Text>
            )}
        </Pressable>
    );
}

const addStyles = StyleSheet.create({
    searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    searchBtn: {
        backgroundColor: colors.accent,
        borderRadius: 12,
        width: 44,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    resultList: {
        marginTop: 12,
        backgroundColor: colors.bg,
        borderRadius: 12,
        overflow: "hidden",
    },
    resultRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    resultName: {
        fontSize: fontSize.callout,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    resultLevel: { fontSize: fontSize.footnote, color: colors.text3, marginTop: 2 },
    chip: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
        minWidth: 60,
        alignItems: "center",
    },
    chipText: { fontSize: fontSize.footnote, fontWeight: fontWeight.semibold },
});

// ── PokeSheet ──────────────────────────────────────────────────────────────────

function PokeSheet({
    visible,
    target,
    onClose,
}: {
    visible: boolean;
    target: Friend | null;
    onClose: () => void;
}) {
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setMessage("");
            setError(null);
        }
    }, [visible]);

    async function handleSend() {
        if (!target) return;
        setSending(true);
        try {
            await sendPoke(target.user_id, message.trim() || undefined);
            onClose();
        } catch (e) {
            setError(getApiErrorMessage(e));
        } finally {
            setSending(false);
        }
    }

    return (
        <BottomSheet visible={visible} onClose={onClose}>
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.header}>
                <Text style={sheetStyles.title}>
                    {target?.nickname}님 콕 찌르기
                </Text>
                <Pressable onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={colors.text3} />
                </Pressable>
            </View>
            <View style={sheetStyles.body}>
                <Text style={sheetStyles.label}>메시지 (선택)</Text>
                <TextInput
                    style={[sheetStyles.input, { height: 80 }]}
                    value={message}
                    onChangeText={(t) => {
                        setMessage(t);
                        setError(null);
                    }}
                    placeholder="한 마디 남기기 (최대 200자)"
                    placeholderTextColor={colors.text3}
                    multiline
                    maxLength={200}
                />
                {error ? (
                    <Text style={sheetStyles.errorText}>{error}</Text>
                ) : null}
            </View>
            <View style={sheetStyles.footer}>
                <Pressable
                    style={[
                        sheetStyles.saveBtn,
                        sending && sheetStyles.saveBtnDisabled,
                    ]}
                    onPress={handleSend}
                    disabled={sending}
                >
                    {sending ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={sheetStyles.saveBtnText}>콕 찌르기</Text>
                            <MaterialCommunityIcons name="hand-pointing-right" size={20} color={colors.white} />
                        </View>
                    )}
                </Pressable>
            </View>
        </BottomSheet>
    );
}

// ── 유틸 ───────────────────────────────────────────────────────────────────────

function formatRelativeTime(isoStr: string): string {
    // 서버는 KST naive datetime을 반환한다(Z·offset 없음). 기기도 KST이므로
    // 그대로 파싱하면 로컬(KST)로 해석된다. Z를 붙이면 +9h 이중 변환된다.
    const diff = Date.now() - new Date(isoStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금";
    if (min < 60) return `${min}분 전`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
}

// ── Community 메인 화면 ────────────────────────────────────────────────────────

export default function Community() {
    const insets = useSafeAreaInsets();

    const [friends, setFriends] = useState<Friend[]>([]);
    const [pendingRequests, setPendingRequests] = useState<
        PendingFriendRequest[]
    >([]);
    const [pokes, setPokes] = useState<Poke[]>([]);
    const [sentUserIds, setSentUserIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [addSheet, setAddSheet] = useState(false);
    const [pokeTarget, setPokeTarget] = useState<Friend | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    const friendUserIds = new Set(friends.map((f) => f.user_id));
    const pendingFromUserIds = new Set(pendingRequests.map((r) => r.user_id));
    const friendMap = Object.fromEntries(
        friends.map((f) => [f.user_id, f.nickname]),
    );

    const inboxEmpty = pendingRequests.length === 0 && pokes.length === 0;

    useFocusEffect(
        useCallback(() => {
            load();
        }, []),
    );

    async function refresh() {
        setRefreshing(true);
        try {
            const [fl, pr, pl, sent] = await Promise.all([
                fetchFriends().catch(() => [] as Friend[]),
                fetchPendingRequests().catch(() => [] as PendingFriendRequest[]),
                fetchReceivedPokes().catch(() => [] as Poke[]),
                fetchSentRequestUserIds().catch(() => [] as number[]),
            ]);
            setFriends(fl);
            setPendingRequests(pr);
            setPokes(pl);
            setSentUserIds(new Set(sent));
        } finally {
            setRefreshing(false);
        }
    }

    async function load() {
        setLoading(true);
        try {
            const [fl, pr, pl, sent] = await Promise.all([
                fetchFriends().catch(() => [] as Friend[]),
                fetchPendingRequests().catch(() => [] as PendingFriendRequest[]),
                fetchReceivedPokes().catch(() => [] as Poke[]),
                fetchSentRequestUserIds().catch(() => [] as number[]),
            ]);
            setFriends(fl);
            setPendingRequests(pr);
            setPokes(pl);
            setSentUserIds(new Set(sent));
        } finally {
            setLoading(false);
        }
    }

    async function handleAccept(req: PendingFriendRequest) {
        setActionLoadingId(req.friendship_id);
        try {
            await acceptFriendRequest(req.friendship_id);
            await load();
        } catch (e) {
            Alert.alert("오류", getApiErrorMessage(e));
        } finally {
            setActionLoadingId(null);
        }
    }

    async function handleReject(req: PendingFriendRequest) {
        setActionLoadingId(req.friendship_id);
        try {
            await removeFriend(req.friendship_id);
            await load();
        } catch (e) {
            Alert.alert("오류", getApiErrorMessage(e));
        } finally {
            setActionLoadingId(null);
        }
    }

    async function handleDeleteFriend(friend: Friend) {
        Alert.alert(
            "친구 삭제",
            `${friend.nickname}님을 친구 목록에서 삭제할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeFriend(friend.friendship_id);
                            await load();
                        } catch (e) {
                            Alert.alert("오류", getApiErrorMessage(e));
                        }
                    },
                },
            ],
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            <AddFriendSheet
                visible={addSheet}
                onClose={() => setAddSheet(false)}
                onAdded={load}
                friendUserIds={friendUserIds}
                sentUserIds={sentUserIds}
                pendingFromUserIds={pendingFromUserIds}
            />
            <PokeSheet
                visible={pokeTarget !== null}
                target={pokeTarget}
                onClose={() => setPokeTarget(null)}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + 96 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        tintColor={colors.accent}
                    />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.pageTitle}>커뮤니티</Text>
                    <Text style={styles.subtitle}>
                        등록된 친구 {loading ? "…" : friends.length}명
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator
                        color={colors.accent}
                        style={{ marginTop: 40 }}
                    />
                ) : (
                    <>
                        {/* 수신함 — 친구 요청 + 받은 콕 찌르기 */}
                        <Text style={styles.sectionHeader}>수신함</Text>
                        <View style={styles.section}>
                            {inboxEmpty ? (
                                <View style={styles.emptyRow}>
                                    <Text style={styles.emptyText}>
                                        새로운 알림이 없어요
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {pendingRequests.map((req, i) => (
                                        <View
                                            key={`req-${req.friendship_id}`}
                                            style={[
                                                styles.inboxRow,
                                                (i < pendingRequests.length - 1 ||
                                                    pokes.length > 0) &&
                                                    styles.rowBorder,
                                            ]}
                                        >
                                            <Text style={styles.inboxEmoji}>
                                                {req.character_emoji}
                                            </Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.inboxTitle}>
                                                    {req.nickname}
                                                    <Text
                                                        style={
                                                            styles.inboxSub
                                                        }
                                                    >
                                                        {" "}
                                                        님의 친구 요청
                                                    </Text>
                                                </Text>
                                                <Text
                                                    style={styles.inboxMeta}
                                                >
                                                    Lv.{req.character_level}
                                                </Text>
                                            </View>
                                            <View style={styles.reqActions}>
                                                <Pressable
                                                    style={[
                                                        styles.acceptBtn,
                                                        actionLoadingId ===
                                                            req.friendship_id &&
                                                            { opacity: 0.5 },
                                                    ]}
                                                    onPress={() =>
                                                        handleAccept(req)
                                                    }
                                                    disabled={
                                                        actionLoadingId !== null
                                                    }
                                                >
                                                    {actionLoadingId ===
                                                    req.friendship_id ? (
                                                        <ActivityIndicator
                                                            size="small"
                                                            color={colors.white}
                                                        />
                                                    ) : (
                                                        <Text
                                                            style={
                                                                styles.acceptBtnText
                                                            }
                                                        >
                                                            수락
                                                        </Text>
                                                    )}
                                                </Pressable>
                                                <Pressable
                                                    style={styles.rejectBtn}
                                                    onPress={() =>
                                                        handleReject(req)
                                                    }
                                                    disabled={
                                                        actionLoadingId !== null
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.rejectBtnText
                                                        }
                                                    >
                                                        거절
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    ))}

                                    {pokes.map((poke, i) => (
                                        <View
                                            key={`poke-${poke.id}`}
                                            style={[
                                                styles.inboxRow,
                                                i < pokes.length - 1 &&
                                                    styles.rowBorder,
                                            ]}
                                        >
                                            <MaterialCommunityIcons name="hand-pointing-right" size={26} color={colors.accent} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.inboxTitle}>
                                                    {friendMap[
                                                        poke.sender_id
                                                    ] ??
                                                        `사용자 #${poke.sender_id}`}
                                                    <Text
                                                        style={
                                                            styles.inboxSub
                                                        }
                                                    >
                                                        {" "}
                                                        님이 콕 찔렀어요
                                                    </Text>
                                                </Text>
                                                {poke.message ? (
                                                    <Text
                                                        style={styles.inboxMeta}
                                                    >
                                                        {poke.message}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <Text style={styles.inboxTime}>
                                                {formatRelativeTime(
                                                    poke.created_at,
                                                )}
                                            </Text>
                                        </View>
                                    ))}
                                </>
                            )}
                        </View>

                        {/* 친구 목록 */}
                        <Text style={styles.sectionHeader}>친구</Text>
                        <View style={styles.section}>
                            {friends.length === 0 ? (
                                <View style={styles.emptyRow}>
                                    <Text style={styles.emptyText}>
                                        아직 친구가 없어요
                                    </Text>
                                </View>
                            ) : (
                                friends.map((friend, i) => (
                                    <View
                                        key={friend.friendship_id}
                                        style={[
                                            styles.friendRow,
                                            i < friends.length - 1 &&
                                                styles.rowBorder,
                                        ]}
                                    >
                                        <BadgeCircle badgeName={friend.equipped_badge_name} level={friend.character_level} />
                                        <View style={styles.friendInfo}>
                                            <Text style={styles.friendName}>
                                                {friend.nickname}
                                            </Text>
                                            <Text style={styles.friendLevel}>
                                                Lv.{friend.character_level}
                                            </Text>
                                        </View>
                                        <View style={styles.friendActions}>
                                            <Pressable
                                                style={styles.pokeBtn}
                                                onPress={() =>
                                                    setPokeTarget(friend)
                                                }
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                    <Text style={styles.pokeBtnText}>콕</Text>
                                                    <MaterialCommunityIcons name="hand-pointing-right" size={15} color={colors.accent} />
                                                </View>
                                            </Pressable>
                                            <Pressable
                                                onPress={() =>
                                                    handleDeleteFriend(friend)
                                                }
                                                hitSlop={8}
                                                style={{ padding: 4 }}
                                            >
                                                <Ionicons
                                                    name="trash-outline"
                                                    size={18}
                                                    color={colors.accent}
                                                />
                                            </Pressable>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                        <Pressable
                            style={styles.addBtn}
                            onPress={() => setAddSheet(true)}
                        >
                            <Text style={styles.addBtnText}>+ 친구 추가</Text>
                        </Pressable>
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
    topFade: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
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
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.separator,
    },
    emptyRow: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: "center",
    },
    emptyText: { fontSize: fontSize.body, color: colors.text3 },

    // 수신함 행
    inboxRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 10,
        minHeight: 56,
    },
    inboxEmoji: { fontSize: 24 },
    inboxTitle: {
        fontSize: fontSize.callout,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    inboxSub: { fontWeight: fontWeight.regular, color: colors.text2 },
    inboxMeta: { fontSize: fontSize.footnote, color: colors.text3, marginTop: 2 },
    inboxTime: { fontSize: fontSize.footnote, color: colors.text3, flexShrink: 0 },

    reqActions: { flexDirection: "row", gap: 6 },
    acceptBtn: {
        backgroundColor: colors.accent,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        minWidth: 44,
        alignItems: "center",
    },
    acceptBtnText: {
        fontSize: fontSize.footnote,
        fontWeight: fontWeight.semibold,
        color: colors.white,
    },
    rejectBtn: {
        backgroundColor: colors.bg,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    rejectBtnText: {
        fontSize: fontSize.footnote,
        fontWeight: fontWeight.semibold,
        color: colors.text3,
    },

    // 친구 행
    friendRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 56,
    },
    friendInfo: { flex: 1 },
    friendName: {
        fontSize: fontSize.callout,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    friendLevel: { fontSize: fontSize.footnote, color: colors.text3, marginTop: 2 },
    friendActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    pokeBtn: {
        backgroundColor: "rgba(26,92,204,0.09)",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    pokeBtnText: {
        fontSize: fontSize.footnote,
        fontWeight: fontWeight.semibold,
        color: colors.accent,
    },

    addBtn: { alignItems: "center", paddingVertical: 10 },
    addBtnText: {
        color: colors.accent,
        fontSize: fontSize.subhead,
        fontWeight: fontWeight.medium,
    },
});
