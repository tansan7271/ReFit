import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { useBadgeStore } from '@/store/badgeStore';

export default function BadgesScreen() {
  const { allBadges, myBadges, loading, fetchData } = useBadgeStore();

  useEffect(() => {
    fetchData();
  }, []);

  const myBadgeIds = new Set(myBadges.map((ub) => ub.badge.id));
  const earned = myBadges;
  const locked = allBadges.filter((b) => !myBadgeIds.has(b.id));

  const isNew = (badgeId: number) => {
    const ub = myBadges.find((u) => u.badge.id === badgeId);
    if (!ub) return false;
    const diff = Date.now() - new Date(ub.earned_at).getTime();
    return diff < 48 * 60 * 60 * 1000; // 48시간 이내
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>내 뱃지 컬렉션</Text>
          <Text style={styles.subtitle}>리핏과 함께 모은 성장의 기록</Text>
          <View style={styles.statRow}>
            {[
              { val: String(earned.length), lbl: '획득' },
              { val: String(locked.length), lbl: '미획득' },
              { val: String(allBadges.length), lbl: '전체' },
            ].map((s) => (
              <View key={s.lbl} style={styles.stat}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLbl}>{s.lbl}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 본문 */}
        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* 획득 뱃지 */}
              {earned.length > 0 && (
                <>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>🏆 획득한 뱃지</Text>
                    <Text style={styles.sectionCount}>· {earned.length}개</Text>
                  </View>
                  <View style={styles.grid}>
                    {earned.map((ub) => (
                      <View key={ub.id} style={styles.badgeItem}>
                        {isNew(ub.badge.id) && (
                          <View style={styles.newTag}>
                            <Text style={styles.newTagText}>NEW</Text>
                          </View>
                        )}
                        <Text style={styles.badgeIcon}>{ub.badge.emoji}</Text>
                        <Text style={styles.badgeName}>{ub.badge.name}</Text>
                        <Text style={styles.badgeCount}>+{ub.badge.xp_reward} XP</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* 미획득 뱃지 */}
              {locked.length > 0 && (
                <>
                  <View style={[styles.sectionRow, earned.length > 0 && { marginTop: 8 }]}>
                    <Text style={styles.sectionTitle}>🔒 아직 획득하지 못한 뱃지</Text>
                    <Text style={styles.sectionCount}>· {locked.length}개</Text>
                  </View>
                  <View style={styles.grid}>
                    {locked.map((badge) => (
                      <View key={badge.id} style={[styles.badgeItem, styles.lockedBadge]}>
                        <Text style={[styles.badgeIcon, styles.lockedIcon]}>{badge.emoji}</Text>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                        <Text style={[styles.badgeCount, { color: colors.text3 }]}>
                          {badge.condition_value}회 달성
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {allBadges.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    운동을 완료하면 뱃지를 획득할 수 있어요! 🏅
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 20 },
  header: {
    backgroundColor: colors.accent2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: { fontSize: 18, fontWeight: fontWeight.black, color: '#fff', marginBottom: 3 },
  subtitle: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.md },
  statRow: { flexDirection: 'row', gap: 7 },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 11,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statVal: { fontSize: 17, fontWeight: fontWeight.heavy, color: '#fff', lineHeight: 20 },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.75)', marginTop: 1, letterSpacing: 0.5 },
  body: { padding: 11, paddingBottom: 14 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.heavy, color: colors.text },
  sectionCount: { fontSize: 10, color: colors.text3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 },
  badgeItem: {
    width: '31%',
    backgroundColor: colors.card,
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    position: 'relative',
  },
  lockedBadge: { opacity: 0.5, backgroundColor: '#f3f1ee' },
  newTag: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent2,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newTagText: { fontSize: 8, color: '#fff', fontWeight: fontWeight.heavy, letterSpacing: 0.5 },
  badgeIcon: { fontSize: 30, lineHeight: 34, marginBottom: 4 },
  lockedIcon: { opacity: 0.4 },
  badgeName: {
    fontSize: 10,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 1,
    lineHeight: 13,
    textAlign: 'center',
  },
  badgeCount: { fontSize: 9, color: colors.accent },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: { fontSize: fontSize.sm, color: colors.text3, textAlign: 'center', lineHeight: 20 },
});
