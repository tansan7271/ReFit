import { useEffect, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { useLoopAnimation } from '@/hooks/useLoopAnimation';
import { completeWorkoutSession } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkoutStore } from '@/store/workoutStore';

export default function SessionScreen() {
  const router = useRouter();
  const bounceAnim = useLoopAnimation(-12, 900);
  const user = useAuthStore((s) => s.user);
  const { startSession, currentSessionId, setCurrentSessionId } = useWorkoutStore();
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!currentSessionId) {
      startSession();
    }
  }, []);

  const charEmoji = user?.character_emoji ?? '🐣';

  const handleComplete = async () => {
    setCompleting(true);
    try {
      if (currentSessionId) {
        await completeWorkoutSession(currentSessionId, { sets: [] });
        setCurrentSessionId(null);
      }
      router.replace('/(main)/post-workout');
    } catch {
      Alert.alert(
        '기록 실패',
        '운동 기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setCompleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.statusLabel}>● 운동 중</Text>

        <Text style={styles.syncTitle}>
          워치와 연동 중이에요
          {'\n'}
          <Text style={styles.syncSub}>Apple Watch / Samsung Watch</Text>
        </Text>

        <Animated.Text style={[styles.char, { transform: [{ translateY: bounceAnim }] }]}>
          {charEmoji}
        </Animated.Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLine}>운동 데이터는 워치에서 자동 수집돼요</Text>
          <Text style={styles.infoLine2}>종료 후 앱에서 기록을 확인하세요 💪</Text>
        </View>

        <TouchableOpacity
          style={[styles.completeBtn, completing && { opacity: 0.6 }]}
          onPress={handleComplete}
          activeOpacity={0.85}
          disabled={completing}
        >
          <Text style={styles.completeBtnText}>
            {completing ? '기록 중...' : '운동 완료! 기록하기 →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: spacing.xl,
  },
  statusLabel: {
    fontSize: 10,
    color: colors.text2,
    letterSpacing: 1.2,
    fontWeight: fontWeight.bold,
  },
  syncTitle: {
    fontSize: 17,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  syncSub: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    color: colors.text2,
  },
  char: { fontSize: 100 },
  infoBox: {
    backgroundColor: colors.softBlue,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  infoLine: { fontSize: fontSize.xs, color: colors.text2, marginBottom: 4, textAlign: 'center' },
  infoLine2: { fontSize: fontSize.sm, color: colors.text, textAlign: 'center' },
  completeBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  completeBtnText: { fontSize: 15, fontWeight: fontWeight.heavy, color: '#fff' },
});
