import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { useLoopAnimation } from '@/hooks/useLoopAnimation';
import { useAuthStore } from '@/store/authStore';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export default function HomeScreen() {
  const router = useRouter();
  const floatAnim = useLoopAnimation(-7, 1500);
  const user = useAuthStore((s) => s.user);

  const todayDow = new Date().getDay(); // 0=일 ~ 6=토
  // 백엔드 day_of_week: 0=월 ~ 6=일, JS: 0=일 ~ 6=토
  const backendDow = todayDow === 0 ? 6 : todayDow - 1;
  const todayLabel = DAY_LABELS[backendDow];

  const nickname = user?.nickname ?? '리핏';
  const charEmoji = user?.character_emoji ?? '🐣';
  const charLevel = user?.character_level ?? 1;
  const charXp = user?.character_xp ?? 0;
  const xpToNextLevel = 500;
  const xpPercent = Math.min((charXp % xpToNextLevel) / xpToNextLevel, 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.greeting}>안녕하세요 👋</Text>
          <Text style={styles.userName}>{nickname}과 함께</Text>
          <Text style={styles.dateWeather}>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}{' '}
            ({todayLabel})
          </Text>
        </View>

        <View style={styles.body}>
          {/* 케어 배너 */}
          <View style={styles.careBanner}>
            <Animated.Text
              style={[styles.bannerChar, { transform: [{ translateY: floatAnim }] }]}
            >
              {charEmoji}
            </Animated.Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTag}>⚡ 운동 전 케어</Text>
              <Text style={styles.bannerMsg}>
                {'오늘 운동 전에\n컨디션을 체크해봐요!'}
              </Text>
              <View style={styles.bannerChips}>
                {['🍌 탄수 보충', '🧘 스트레칭', '💧 수분'].map((chip) => (
                  <View key={chip} style={styles.bannerChip}>
                    <Text style={styles.bannerChipText}>{chip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* 오늘의 플랜 */}
          <View>
            <Text style={styles.sectionTitle}>오늘의 플랜</Text>
            <View style={styles.todayPlan}>
              <View style={styles.planRow}>
                <View style={[styles.planIcon, { backgroundColor: colors.softBlue }]}>
                  <Text>🏋️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>오늘 ({todayLabel}요일) 운동</Text>
                  <Text style={styles.planTime}>운동 탭에서 플랜을 확인하세요</Text>
                </View>
                <View style={[styles.planBadge, { backgroundColor: colors.softBlue }]}>
                  <Text style={[styles.planBadgeText, { color: colors.accent }]}>D-day</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 캐릭터 미니 카드 */}
          <View style={styles.charMiniCard}>
            <Animated.Text
              style={[styles.charMiniEmoji, { transform: [{ translateY: floatAnim }] }]}
            >
              {charEmoji}
            </Animated.Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.charMiniName}>{nickname} · Lv.{charLevel}</Text>
              <Text style={styles.charMiniStatus}>😊 오늘도 화이팅!</Text>
              <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${Math.round(xpPercent * 100)}%` }]} />
              </View>
            </View>
          </View>

          {/* 운동 시작 버튼 */}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push('/(main)/pre-workout')}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>운동 전 체크하기 →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: { fontSize: fontSize.sm, color: colors.text2, marginBottom: 2 },
  userName: { fontSize: 20, fontWeight: fontWeight.heavy, color: colors.text },
  dateWeather: { fontSize: fontSize.xs, color: colors.text3, marginTop: 2 },
  body: { padding: spacing.md, gap: 11 },
  careBanner: {
    backgroundColor: colors.accent,
    borderRadius: 17,
    padding: 13,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
  },
  bannerChar: { fontSize: 26 },
  bannerTag: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 3,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.6,
  },
  bannerMsg: {
    fontSize: fontSize.sm,
    color: '#fff',
    lineHeight: 18,
    fontWeight: fontWeight.regular,
  },
  bannerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 7 },
  bannerChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bannerChipText: { fontSize: 10, color: '#fff', fontWeight: fontWeight.bold },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 7,
  },
  todayPlan: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  planIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  planTime: { fontSize: 10, color: colors.text3 },
  planBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  planBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
  charMiniCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  charMiniEmoji: { fontSize: 42 },
  charMiniName: { fontSize: fontSize.md, fontWeight: fontWeight.heavy, color: colors.text },
  charMiniStatus: {
    fontSize: fontSize.xs,
    color: colors.accent2,
    fontWeight: fontWeight.regular,
    marginTop: 1,
  },
  xpBarBg: {
    marginTop: 5,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: 4,
    backgroundColor: colors.green,
    borderRadius: 4,
  },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    padding: 13,
    alignItems: 'center',
  },
  startBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.heavy, color: '#fff' },
});
