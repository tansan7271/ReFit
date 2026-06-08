import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { submitOnboarding } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

const TOTAL_STEPS = 5;

function StepDots({ current }: { current: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <View key={i} style={[dotStyles.dot, i === current - 1 ? dotStyles.active : dotStyles.inactive]} />
      ))}
    </View>
  );
}
const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  active: { width: 20, backgroundColor: colors.accent },
  inactive: { width: 6, backgroundColor: colors.border },
});

export default function CharacterIntro() {
  const router = useRouter();
  const { buildPayload, reset } = useOnboardingStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = buildPayload();
      const updatedUser = await submitOnboarding(payload);
      useAuthStore.getState().setUser(updatedUser);
      reset();
      router.replace('/(main)');
    } catch {
      setError('저장 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <View style={styles.header}>
          <StepDots current={5} />
          <Text style={styles.title}>나의 캐릭터</Text>
          <Text style={styles.subtitle}>ReFit과 함께 운동을 시작해봐요</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.characterPlaceholder} />
        </View>

        <View style={styles.bottomAction}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.bottomRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.text2} />
            </Pressable>
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleStart}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.buttonText}>시작하기</Text>
              }
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
    fontSize: fontSize.largeTitle, fontWeight: '900', color: colors.text,
    letterSpacing: -0.5, marginTop: 16, marginBottom: 4,
  },
  subtitle: { fontSize: fontSize.subhead, color: colors.text2 },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  characterPlaceholder: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.bg,
    borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed',
  },
  bottomAction: {
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8,
    backgroundColor: colors.white,
  },
  errorText: {
    color: colors.red, fontSize: fontSize.subhead,
    textAlign: 'center', marginBottom: 8,
  },
  bottomRow: { flexDirection: 'row', gap: 10 },
  backBtn: {
    width: 52, borderRadius: 12, backgroundColor: colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  button: {
    flex: 1, backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: colors.white, fontSize: fontSize.headline,
    fontWeight: fontWeight.semibold,
  },
});
