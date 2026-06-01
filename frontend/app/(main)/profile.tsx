import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { MenuSection } from '@/components/ui/MenuSection';
import { InBodyModal } from '@/components/modals/InBodyModal';
import { ProfileEditModal } from '@/components/modals/ProfileEditModal';
import { NotificationSettingsModal } from '@/components/modals/NotificationSettingsModal';
import { fetchInbodyHistory } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { InBodyRecord, User } from '@/types';

const FITNESS_LEVEL_LABEL: Record<string, string> = {
  beginner: '초보자',
  intermediate: '중급자',
  advanced: '상급자',
  athlete: '운동선수급',
};

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const signOut = useAuthStore((s) => s.signOut);
  const [inbodyVisible, setInbodyVisible] = useState(false);
  const [latestInbody, setLatestInbody] = useState<InBodyRecord | null>(null);
  const [profileEditVisible, setProfileEditVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  useEffect(() => {
    fetchInbodyHistory(1)
      .then((records) => setLatestInbody(records[0] ?? null))
      .catch(() => {});
  }, []);

  const handleSaveInbody = (record: InBodyRecord) => {
    setLatestInbody(record);
    setInbodyVisible(false);
  };

  const handleSaveProfile = (updated: User) => {
    setUser(updated);
  };

  const nickname = user?.nickname ?? '–';
  const charEmoji = user?.character_emoji ?? '🐣';
  const charLevel = user?.character_level ?? 1;
  const fitnessLabel = FITNESS_LEVEL_LABEL[user?.fitness_level ?? 'beginner'] ?? '초보자';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.profGreet}>MY REFIT</Text>
          <View style={styles.profRow}>
            <Text style={styles.profChar}>{charEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.profName}>{nickname} · Lv.{charLevel}</Text>
              <Text style={styles.profMeta}>
                {user?.character_xp ?? 0} XP 획득
              </Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => setProfileEditVisible(true)}>
              <Text style={styles.editBtnText}>수정</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 본문 */}
        <View style={styles.body}>
          {/* 인바디 카드 */}
          <View style={styles.inbodyCard}>
            <View style={styles.inbodyHeader}>
              <Text style={{ fontSize: 18 }}>⚖️</Text>
              <Text style={styles.inbodyTitle}>인바디 업데이트</Text>
              <View style={styles.inbodyTag}>
                <Text style={styles.inbodyTagText}>권장: 주 1회</Text>
              </View>
            </View>
            <Text style={styles.inbodyLast}>
              {latestInbody
                ? `마지막 업데이트 · ${new Date(latestInbody.measured_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`
                : '아직 기록이 없어요'}
            </Text>
            <View style={styles.inbodyGrid}>
              {[
                {
                  label: '체중',
                  val: latestInbody?.weight_kg?.toFixed(1) ?? '–',
                  unit: 'kg',
                  color: colors.text,
                },
                {
                  label: '골격근량',
                  val: latestInbody?.muscle_mass_kg?.toFixed(1) ?? '–',
                  unit: 'kg',
                  color: colors.text,
                },
                {
                  label: '체지방률',
                  val: latestInbody?.body_fat_percent?.toFixed(1) ?? '–',
                  unit: '%',
                  color: colors.text,
                },
              ].map((item, i) => (
                <View key={i} style={styles.inbodyCell}>
                  <Text style={styles.inbodyCellLbl}>{item.label}</Text>
                  <Text style={styles.inbodyCellVal}>
                    {item.val}
                    <Text style={styles.inbodyCellUnit}> {item.unit}</Text>
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.inbodyUpdateBtn}
              onPress={() => setInbodyVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.inbodyUpdateBtnText}>✏️ 오늘 수치 입력하기</Text>
            </TouchableOpacity>
            <Text style={styles.inbodyHint}>
              {'강제 알림 없이 '}
              <Text style={{ color: colors.accent, fontWeight: fontWeight.bold }}>
                원할 때 자발적으로
              </Text>
              {' 기록해요 💜'}
            </Text>
          </View>

          <MenuSection
            label="기본 정보"
            items={[
              {
                icon: '👤',
                bg: colors.softBlue,
                name: '프로필',
                meta: `${nickname} · ${user?.age ? `${user.age}세` : '나이 미설정'}`,
              },
              { icon: '💪', bg: colors.softGreen, name: '운동 숙련도', meta: fitnessLabel },
              {
                icon: '🌙',
                bg: '#e3f2fd',
                name: '수면 목표',
                meta:
                  user?.sleep_goal_bedtime && user?.sleep_goal_wakeup
                    ? `${user.sleep_goal_bedtime} – ${user.sleep_goal_wakeup}`
                    : '미설정',
              },
              {
                icon: '🏅',
                bg: '#fff8e8',
                name: '뱃지 컬렉션',
                meta: '보러가기',
                onPress: () => router.push('/(main)/badges'),
              },
            ]}
          />

          <MenuSection
            label="환경 설정"
            items={[
              {
                icon: '🔔',
                bg: colors.softBlue,
                name: '알림 설정',
                meta: '보통',
                onPress: () => setNotifVisible(true),
              },
              { icon: '📱', bg: '#fff0f0', name: '헬스 앱 연동', meta: 'Apple Health' },
              { icon: '🔒', bg: colors.softAmber, name: '개인정보 · 데이터' },
            ]}
          />

          <MenuSection
            label="기타"
            items={[
              { icon: '💬', bg: '#f0f0f0', name: '고객 지원 · FAQ' },
              { icon: 'ℹ️', bg: '#f0f0f0', name: '앱 정보', meta: 'v0.2.0' },
              {
                icon: '🚪',
                bg: '#fff0f0',
                name: '로그아웃',
                onPress: async () => {
                  await signOut();
                  router.replace('/(auth)/login');
                },
              },
            ]}
          />
        </View>
      </ScrollView>

      <InBodyModal
        visible={inbodyVisible}
        onClose={() => setInbodyVisible(false)}
        onSave={handleSaveInbody}
      />

      <ProfileEditModal
        visible={profileEditVisible}
        onClose={() => setProfileEditVisible(false)}
        onSave={handleSaveProfile}
        currentNickname={user?.nickname ?? ''}
        currentAge={user?.age ?? undefined}
      />

      <NotificationSettingsModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 20 },
  header: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  profGreet: { fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, marginBottom: 11 },
  profRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  profChar: { fontSize: 46 },
  profName: { fontSize: 18, fontWeight: fontWeight.heavy, color: '#fff', letterSpacing: -0.2 },
  profMeta: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  editBtnText: { fontSize: 10, color: '#fff', fontWeight: fontWeight.bold },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: 11, marginTop: -24 },
  inbodyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.softBlue,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  inbodyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  inbodyTitle: { flex: 1, fontSize: 13, fontWeight: fontWeight.heavy, color: colors.text },
  inbodyTag: {
    backgroundColor: colors.softBlue,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inbodyTagText: { fontSize: 9, color: colors.accent, fontWeight: fontWeight.heavy, letterSpacing: 0.5 },
  inbodyLast: { fontSize: 10, color: colors.text3, marginBottom: 9 },
  inbodyGrid: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  inbodyCell: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  inbodyCellLbl: { fontSize: 9, color: colors.text3, marginBottom: 2, fontWeight: fontWeight.regular },
  inbodyCellVal: { fontSize: 14, fontWeight: fontWeight.heavy, color: colors.text, lineHeight: 16 },
  inbodyCellUnit: { fontSize: 9, color: colors.text2 },
  inbodyUpdateBtn: {
    backgroundColor: colors.accent,
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  inbodyUpdateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.heavy, color: '#fff' },
  inbodyHint: { fontSize: 10, color: colors.text3, marginTop: 7, textAlign: 'center', lineHeight: 15 },
});
