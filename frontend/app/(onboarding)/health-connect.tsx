import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { getHealthProviderInfo, requestHealthPermissions } from '@/services/health';
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

const FEATURES = ['수면 시간 및 품질', '심박수 및 안정 심박수', '걸음수', '활동 칼로리'];

export default function HealthConnect() {
  const router = useRouter();
  const { setHealthLinked } = useOnboardingStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const info = getHealthProviderInfo();

  const handleConnect = async () => {
    setErrorMsg(null);
    setShowSettings(false);
    setLoading(true);
    try {
      const result = await requestHealthPermissions();
      setHealthLinked(result.granted);
      if (result.granted) {
        router.push('/(onboarding)/character-intro');
      } else {
        setErrorMsg(result.message);
        setShowSettings(result.reason === 'denied');
      }
    } catch {
      setHealthLinked(false);
      setErrorMsg('연동 중 오류가 발생했어요. 나중에 설정에서 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setHealthLinked(false);
    router.push('/(onboarding)/character-intro');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <View style={styles.header}>
          <StepDots current={4} />
          <Text style={styles.title}>건강 데이터 연동</Text>
          <Text style={styles.subtitle}>자동으로 운동 데이터를 가져와요</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.icon}>❤️‍🔥</Text>
          <Text style={styles.providerName}>{info.name}</Text>
          <Text style={styles.providerDesc}>{info.description}</Text>

          <View style={styles.featureCard}>
            {FEATURES.map((feat, i) => (
              <View
                key={feat}
                style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureRowBorder]}
              >
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.skipLink} onPress={handleSkip}>
            <Text style={styles.skipText}>나중에 설정하기</Text>
          </Pressable>
        </View>

        <View style={styles.bottomAction}>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          {showSettings ? (
            <Pressable style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.settingsBtnText}>설정 앱에서 변경하기</Text>
            </Pressable>
          ) : null}
          <View style={styles.bottomRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.text2} />
            </Pressable>
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConnect}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.buttonText}>연동하기</Text>
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
    paddingHorizontal: 16,
  },
  icon: { fontSize: 64, marginBottom: 20 },
  providerName: {
    fontSize: fontSize.title2, fontWeight: fontWeight.bold,
    color: colors.text, marginBottom: 8,
  },
  providerDesc: {
    fontSize: fontSize.subhead, color: colors.text2,
    textAlign: 'center', marginBottom: 28,
  },
  featureCard: {
    alignSelf: 'stretch', backgroundColor: colors.bg,
    borderRadius: 14, overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  featureRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  featureCheck: {
    fontSize: fontSize.body, color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  featureText: { fontSize: fontSize.body, color: colors.text },
  skipLink: { marginTop: 20, paddingVertical: 8 },
  skipText: { fontSize: fontSize.subhead, color: colors.text3 },
  bottomAction: {
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8,
    backgroundColor: colors.white,
  },
  errorText: {
    color: colors.red, fontSize: fontSize.subhead,
    textAlign: 'center', marginBottom: 8,
  },
  settingsBtn: {
    alignSelf: 'stretch', backgroundColor: colors.bg,
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 8,
  },
  settingsBtnText: {
    fontSize: fontSize.subhead, fontWeight: fontWeight.semibold,
    color: colors.text2,
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
