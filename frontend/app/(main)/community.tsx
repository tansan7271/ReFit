import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';

type Tab = 'friends' | 'pokes' | 'coop';

const FRIENDS = [
  { avatar: '🦊', name: '지우', status: '● 지금 러닝 중 · 3.2km', isLive: true, bg: '#fff0e0' },
  { avatar: '🐰', name: '민서', status: '오늘 운동 완료 · 어깨 데이', isLive: false, bg: '#ffe0eb' },
  { avatar: '🐱', name: '준호', status: '7일 연속 운동 중 🔥', isLive: false, bg: '#e3f2fd' },
  { avatar: '🐶', name: '하은', status: '오늘은 휴식일', isLive: false, bg: '#e8f5ee' },
  { avatar: '🐻', name: '서연', status: '2일 전 운동', isLive: false, bg: '#fff8e8' },
];

const POKES = [
  { avatar: '🦊', name: '지우', msg: '응원을 보냈어요', time: '5분 전' },
  { avatar: '🐰', name: '민서', msg: '콕! 찔렀어요', time: '2시간 전' },
  { avatar: '🐱', name: '준호', msg: '응원해요', time: '어제' },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [pokedSet, setPokedSet] = useState<Set<number>>(new Set([2]));

  const handlePoke = (idx: number) => {
    setPokedSet((prev) => new Set([...prev, idx]));
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'friends', label: '친구 (5)' },
    { key: 'pokes', label: '받은 응원 3' },
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
                <Text style={styles.sectionCount}>· 5명</Text>
              </View>
              <View style={styles.friendList}>
                {FRIENDS.map((f, i) => (
                  <View
                    key={i}
                    style={[
                      styles.friendRow,
                      i === FRIENDS.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={[styles.friendAvatar, { backgroundColor: f.bg }]}>
                      <Text style={{ fontSize: 22 }}>{f.avatar}</Text>
                      {f.isLive && <View style={styles.liveIndicator} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{f.name}</Text>
                      <Text
                        style={[styles.friendStatus, f.isLive && { color: '#4caf50' }]}
                      >
                        {f.status}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => !pokedSet.has(i) && handlePoke(i)}
                      style={[styles.pokeBtn, pokedSet.has(i) && styles.pokeBtnSent]}
                      disabled={pokedSet.has(i)}
                    >
                      <Text
                        style={[
                          styles.pokeBtnText,
                          pokedSet.has(i) && { color: colors.green },
                        ]}
                      >
                        {pokedSet.has(i) ? '✓ 보냄' : '💪 응원'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* 친구 추가 */}
            <TouchableOpacity style={styles.addFriendBtn}>
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
                  <Text style={styles.pokeCountText}>3 NEW</Text>
                </View>
              </View>
              {POKES.map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.pokeRow,
                    i === POKES.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{p.avatar}</Text>
                  <Text style={styles.pokeMsg}>
                    <Text style={{ fontWeight: fontWeight.heavy }}>{p.name}</Text>
                    {`가 ${p.msg}`}
                  </Text>
                  <Text style={styles.pokeTime}>{p.time}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Co-op 뱃지 탭 */}
        {activeTab === 'coop' && (
          <View style={styles.panel}>
            <View style={styles.coopCard}>
              <View style={styles.coopHeader}>
                <Text style={styles.coopTitle}>✨ 이번 주 Co-op 도전</Text>
                <Text style={styles.coopWeek}>5/5 – 5/11</Text>
              </View>
              <View style={styles.coopTarget}>
                <Text style={{ fontSize: 30 }}>🏆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coopTargetName}>함께 일주일 목표 달성</Text>
                  <Text style={styles.coopTargetDesc}>
                    지우, 민서와 같이 주 4회 운동 완료 시 특수 뱃지!
                  </Text>
                  <View style={styles.coopBar}>
                    <View style={[styles.coopFill, { width: '65%' }]} />
                  </View>
                </View>
              </View>
              <Text style={styles.coopFooter}>
                {'현재 '}
                <Text style={{ color: colors.accent, fontWeight: fontWeight.heavy }}>
                  2/4회
                </Text>
                {' · 모두 함께 달성 시 '}
                <Text style={{ color: colors.accent, fontWeight: fontWeight.heavy }}>
                  Co-op 뱃지 ✨
                </Text>
                {' 지급'}
              </Text>
            </View>
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
  liveIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4caf50',
    borderWidth: 2,
    borderColor: '#fff',
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
  coopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  coopTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.heavy, color: colors.text },
  coopWeek: { fontSize: 10, color: colors.text3 },
  coopTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#fff8e8',
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#f5d060',
    marginBottom: 8,
  },
  coopTargetName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 2,
  },
  coopTargetDesc: { fontSize: 10, color: colors.text2, lineHeight: 14, marginBottom: 5 },
  coopBar: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  coopFill: { height: 5, backgroundColor: colors.accent, borderRadius: 4 },
  coopFooter: { fontSize: 10, color: colors.text2, textAlign: 'center', lineHeight: 15 },
});
