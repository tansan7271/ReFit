import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { coopCelebrate, fetchFriendActivity } from '@/services/api';
import { useCommunityStore } from '@/store/communityStore';
import { useWorkoutStore } from '@/store/workoutStore';
import type { FriendActivity } from '@/types';

type Tab = 'friends' | 'pokes' | 'coop';

const FRIEND_AVATAR_BG = '#f0f4ff';

/** 백엔드 ISO 시각을 "n분 전 / n시간 전 / n일 전" 한국어 상대시각으로 변환 */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const friends = useCommunityStore((s) => s.friends);
  const pokes = useCommunityStore((s) => s.pokes);
  const friendsLoading = useCommunityStore((s) => s.friendsLoading);
  const pokesLoading = useCommunityStore((s) => s.pokesLoading);
  const sentPokeIds = useCommunityStore((s) => s.sentPokeIds);
  const fetchFriendsAction = useCommunityStore((s) => s.fetchFriends);
  const fetchPokesAction = useCommunityStore((s) => s.fetchPokes);
  const sendPokeToUser = useCommunityStore((s) => s.sendPokeToUser);

  const sessions = useWorkoutStore((s) => s.sessions);
  const fetchSessions = useWorkoutStore((s) => s.fetchSessions);

  const [activities, setActivities] = useState<Record<number, FriendActivity>>({});
  const activitiesRef = useRef<Record<number, FriendActivity>>({});
  const [coopLoading, setCoopLoading] = useState(false);
  const [celebratedIds, setCelebratedIds] = useState<number[]>([]);

  const myWorkedOutToday = sessions.some(
    (s) =>
      s.status === 'completed' &&
      new Date(s.started_at).toDateString() === new Date().toDateString(),
  );

  useEffect(() => {
    fetchFriendsAction();
    fetchPokesAction();
  }, [fetchFriendsAction, fetchPokesAction]);

  useEffect(() => {
    if (activeTab !== 'coop') return;
    fetchSessions();
    const missing = friends.filter((f) => !(f.user_id in activitiesRef.current));
    if (missing.length === 0) return;
    let cancelled = false;
    setCoopLoading(true);
    Promise.all(
      missing.map(async (f) => {
        try {
          const activity = await fetchFriendActivity(f.user_id);
          return [f.user_id, activity] as const;
        } catch (error) {
          console.warn('[community] fetchFriendActivity failed', error);
          return null;
        }
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const next = { ...activitiesRef.current };
        for (const r of results) {
          if (r) next[r[0]] = r[1];
        }
        activitiesRef.current = next;
        setActivities({ ...next });
      })
      .finally(() => {
        if (!cancelled) setCoopLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, friends]);

  const handleCoopCelebrate = async (friendId: number) => {
    if (celebratedIds.includes(friendId)) return;
    setCelebratedIds((prev) => [...prev, friendId]);
    try {
      const response = await coopCelebrate(friendId);
      Alert.alert('🎉 Co-op 달성!', response.message);
    } catch {
      setCelebratedIds((prev) => prev.filter((id) => id !== friendId));
      Alert.alert('오류', '잠시 후 다시 시도해 주세요.');
    }
  };

  const handlePoke = (userId: number) => {
    if (sentPokeIds.includes(userId)) return;
    sendPokeToUser(userId);
  };

  const handleAddFriend = () => {
    Alert.alert('친구 추가', '닉네임으로 친구 추가 기능을 준비 중이에요');
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'friends', label: `친구 (${friends.length})` },
    { key: 'pokes', label: `받은 응원 ${pokes.length}` },
    { key: 'coop', label: 'Co-op 뱃지' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 상단 헤더 + 탭 */}
      <View style={styles.header}>
        <Text style={styles.title}>커뮤니티</Text>
        <Text style={styles.subtitle}>경쟁 없이 함께 응원하는 메이트들</Text>
        <View style={styles.tabRow}>
          {TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={[styles.tab, activeTab === key && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.panelPad}
        showsVerticalScrollIndicator={false}
      >
        {/* 친구 탭 */}
        {activeTab === 'friends' && (
          <View style={styles.panel}>
            {/* 랭킹 없음 배너 */}
            <View style={styles.noRankBanner}>
              <Text style={styles.noRankIcon}>🚫</Text>
              <Text style={styles.noRankText}>
                {'REFIT은 '}
                <Text style={{ fontWeight: fontWeight.heavy }}>랭킹·순위가 없어요.</Text>
                {'\n친구는 비교가 아닌 응원의 대상이에요 💜'}
              </Text>
            </View>

            {/* 친구 목록 */}
            <View>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>🐾 친구 목록</Text>
                <Text style={styles.sectionCount}>· {friends.length}명</Text>
              </View>
              {friendsLoading ? (
                <ActivityIndicator />
              ) : (
                <View style={styles.friendList}>
                  {friends.map((f, i) => {
                    const alreadyPoked = sentPokeIds.includes(f.user_id);
                    return (
                      <View
                        key={f.friendship_id}
                        style={[
                          styles.friendRow,
                          i === friends.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View
                          style={[
                            styles.friendAvatar,
                            { backgroundColor: FRIEND_AVATAR_BG },
                          ]}
                        >
                          <Text style={{ fontSize: 22 }}>{f.character_emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.friendName}>{f.nickname}</Text>
                          <Text style={styles.friendStatus}>
                            {`Lv.${f.character_level}`}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handlePoke(f.user_id)}
                          style={[styles.pokeBtn, alreadyPoked && styles.pokeBtnSent]}
                          disabled={alreadyPoked || friendsLoading}
                        >
                          <Text
                            style={[
                              styles.pokeBtnText,
                              alreadyPoked && { color: colors.green },
                            ]}
                          >
                            {alreadyPoked ? '✓ 보냄' : '💪 응원'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 친구 추가 */}
            <TouchableOpacity style={styles.addFriendBtn} onPress={handleAddFriend}>
              <Text style={styles.addFriendText}>＋ 친구 초대하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 받은 응원 탭 */}
        {activeTab === 'pokes' && (
          <View style={styles.panel}>
            <View style={styles.pokeCard}>
              <View style={styles.pokeCardHeader}>
                <Text style={styles.pokeCardTitle}>💌 받은 응원</Text>
                <View style={styles.pokeCountBadge}>
                  <Text style={styles.pokeCountText}>{`${pokes.length} NEW`}</Text>
                </View>
              </View>
              {pokesLoading ? (
                <ActivityIndicator />
              ) : pokes.length === 0 ? (
                <Text style={styles.pokeMsg}>아직 받은 응원이 없어요</Text>
              ) : (
                pokes.map((p, i) => (
                  <View
                    key={p.id}
                    style={[
                      styles.pokeRow,
                      i === pokes.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>🙋</Text>
                    <Text style={styles.pokeMsg}>
                      <Text style={{ fontWeight: fontWeight.heavy }}>
                        {`사용자 #${p.sender_id}`}
                      </Text>
                      {`가 ${p.message ?? '응원을 보냈어요'}`}
                    </Text>
                    <Text style={styles.pokeTime}>{relativeTime(p.created_at)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Co-op 뱃지 탭 */}
        {activeTab === 'coop' && (
          <View style={styles.panel}>
            <View style={styles.coopCard}>
              <Text style={styles.coopTitle}>✨ Co-op 도전</Text>
              <Text style={[styles.coopFooter, { textAlign: 'left', marginTop: 4 }]}>
                {'나와 친구가 같은 날 운동을 완료하면\n함께 Co-op을 달성할 수 있어요!'}
              </Text>
            </View>

            <View style={styles.coopMeCard}>
              <Text style={{ fontSize: 22 }}>{myWorkedOutToday ? '🔥' : '💤'}</Text>
              <Text style={styles.coopMeText}>
                {myWorkedOutToday
                  ? '오늘 운동 완료! 친구와 함께 달성해 보세요'
                  : '오늘 운동을 완료하면 Co-op에 도전할 수 있어요'}
              </Text>
            </View>

            {friends.length === 0 ? (
              <View style={styles.coopCard}>
                <Text style={[styles.coopFooter, { paddingVertical: 12 }]}>
                  친구를 추가하면 Co-op 도전을 시작할 수 있어요!
                </Text>
              </View>
            ) : coopLoading && Object.keys(activities).length === 0 ? (
              <ActivityIndicator style={{ marginTop: 16 }} />
            ) : (
              friends.map((f) => {
                const activity = activities[f.user_id];
                const workedOutToday = activity?.worked_out_today ?? false;
                const canCelebrate = myWorkedOutToday && workedOutToday;
                const celebrated = celebratedIds.includes(f.user_id);
                return (
                  <View key={f.friendship_id} style={styles.coopFriendCard}>
                    <View style={styles.coopFriendHeader}>
                      <View
                        style={[styles.friendAvatar, { backgroundColor: FRIEND_AVATAR_BG }]}
                      >
                        <Text style={{ fontSize: 22 }}>{f.character_emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendName}>{f.nickname}</Text>
                        {activity ? (
                          <Text style={styles.friendStatus}>
                            {`이번 주 ${activity.workout_count_this_week}회`}
                          </Text>
                        ) : (
                          <Text style={styles.friendStatus}>활동 불러오는 중…</Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.coopBadge,
                          workedOutToday ? styles.coopBadgeDone : styles.coopBadgeIdle,
                        ]}
                      >
                        <Text
                          style={[
                            styles.coopBadgeText,
                            { color: workedOutToday ? colors.green : colors.text3 },
                          ]}
                        >
                          {workedOutToday ? '오늘 운동 완료 ✅' : '아직 운동 전'}
                        </Text>
                      </View>
                    </View>

                    {canCelebrate && (
                      <TouchableOpacity
                        style={[styles.coopBtn, celebrated && styles.coopBtnDone]}
                        onPress={() => handleCoopCelebrate(f.user_id)}
                        disabled={celebrated}
                      >
                        <Text
                          style={[
                            styles.coopBtnText,
                            celebrated && { color: colors.green },
                          ]}
                        >
                          {celebrated ? '✓ 달성 완료' : '🎉 함께 달성!'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 19, fontWeight: fontWeight.heavy, color: colors.text },
  subtitle: { fontSize: fontSize.xs, color: colors.text3, marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: 18, marginTop: 11 },
  tab: {
    paddingBottom: 9,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text3 },
  tabTextActive: { color: colors.accent },
  panelPad: { padding: 11, paddingBottom: 20 },
  panel: { gap: 10 },
  noRankBanner: {
    backgroundColor: colors.softBlue,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cac6f8',
  },
  noRankIcon: { fontSize: 17 },
  noRankText: {
    fontSize: 10,
    color: colors.accent,
    lineHeight: 15,
    fontWeight: fontWeight.regular,
    flex: 1,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.heavy, color: colors.text },
  sectionCount: { fontSize: 10, color: colors.text3 },
  friendList: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 11,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  friendName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 1,
  },
  friendStatus: { fontSize: 10, color: colors.text3, lineHeight: 14 },
  pokeBtn: {
    backgroundColor: colors.softBlue,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#d4ccff',
  },
  pokeBtnSent: { backgroundColor: colors.softGreen, borderColor: '#a5d6a7' },
  pokeBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.heavy,
    color: colors.accent,
  },
  addFriendBtn: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 11,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  addFriendText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text2 },
  // Pokes tab
  pokeCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pokeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  pokeCardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.heavy, color: colors.text },
  pokeCountBadge: {
    backgroundColor: '#ec407a',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  pokeCountText: { fontSize: 10, color: '#fff', fontWeight: fontWeight.heavy },
  pokeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(236,64,122,0.2)',
  },
  pokeMsg: { flex: 1, fontSize: fontSize.xs, color: colors.text, lineHeight: 14 },
  pokeTime: { fontSize: 9, color: colors.text3 },
  // Co-op tab
  coopCard: { backgroundColor: colors.card, borderRadius: 14, padding: 12 },
  coopTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.heavy, color: colors.text },
  coopFooter: { fontSize: 10, color: colors.text2, textAlign: 'center', lineHeight: 15 },
  coopMeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.softBlue,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#cac6f8',
  },
  coopMeText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    lineHeight: 16,
  },
  coopFriendCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 9,
  },
  coopFriendHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  coopBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  coopBadgeDone: { backgroundColor: colors.softGreen },
  coopBadgeIdle: { backgroundColor: 'rgba(0,0,0,0.05)' },
  coopBadgeText: { fontSize: 10, fontWeight: fontWeight.heavy },
  coopBtn: {
    backgroundColor: colors.accent,
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
  },
  coopBtnDone: { backgroundColor: colors.softGreen },
  coopBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.heavy, color: '#fff' },
});
