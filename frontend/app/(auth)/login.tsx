import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { getApiErrorMessage, login } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

type BlobConfig = {
  size: number;
  top: number;
  left: number;
  color: string;
  duration: number;
  translateX: number;
  translateY: number;
  scaleTo: number;
};

const BLOBS: BlobConfig[] = [
  {
    size: 360,
    top: -40,
    left: -50,
    color: 'rgba(26,92,204,0.40)',
    duration: 2100,
    translateX: 30,
    translateY: 24,
    scaleTo: 1.18,
  },
  {
    size: 288,
    top: 30,
    left: 180,
    color: 'rgba(255,114,0,0.35)',
    duration: 1800,
    translateX: -28,
    translateY: 32,
    scaleTo: 1.22,
  },
  {
    size: 252,
    top: 150,
    left: 40,
    color: 'rgba(255,114,0,0.35)',
    duration: 2500,
    translateX: 36,
    translateY: -20,
    scaleTo: 1.15,
  },
  {
    size: 324,
    top: 120,
    left: 210,
    color: 'rgba(26,92,204,0.40)',
    duration: 2300,
    translateX: -34,
    translateY: -26,
    scaleTo: 1.2,
  },
  {
    size: 216,
    top: 220,
    left: 130,
    color: 'rgba(255,114,0,0.35)',
    duration: 1500,
    translateX: 22,
    translateY: 28,
    scaleTo: 1.25,
  },
];

function Blob({ config }: { config: BlobConfig }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: config.duration,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: config.duration,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [config.duration, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, config.translateX],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, config.translateY],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, config.scaleTo],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blobOuter,
        {
          width: config.size,
          height: config.size,
          top: config.top,
          left: config.left,
          backgroundColor: config.color.replace(/[\d.]+\)$/, '0.18)'),
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      <View
        style={[
          styles.blobMid,
          {
            width: config.size * 0.75,
            height: config.size * 0.75,
            backgroundColor: config.color.replace(/[\d.]+\)$/, '0.35)'),
          },
        ]}
      >
        <View
          style={[
            styles.blobInner,
            {
              width: config.size * 0.5,
              height: config.size * 0.5,
              backgroundColor: config.color.replace(/[\d.]+\)$/, '0.60)'),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const disabled = loading || email.trim().length === 0 || password.length === 0;

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const session = await login(email.trim(), password);
      await useAuthStore
        .getState()
        .setSession(session.accessToken, session.refreshToken, session.user);

      if (session.user.is_onboarding_complete) {
        router.replace('/(main)');
      } else {
        router.replace('/(onboarding)/workout-routine');
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.flex}>
        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.blobLayer}>
            {BLOBS.map((config, index) => (
              <Blob key={index} config={config} />
            ))}
          </View>

          <BlurView
            intensity={90}
            tint="light"
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />

          <LinearGradient
            colors={['rgba(255,255,255,0)', colors.white]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.whiteFade}
            pointerEvents="none"
          />

          <View style={styles.heroText}>
            <Text style={styles.brand}>ReFit</Text>
            <Text style={styles.subtitle}>나만을 위한 맞춤형 운동 전/후 관리 코치</Text>
          </View>
        </View>

        <SafeAreaView edges={['bottom']} style={styles.formArea}>
          <View style={styles.form}>
            <View style={styles.fields}>
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
                autoComplete="password"
                accessibilityLabel="비밀번호 입력"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, disabled && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="로그인"
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>로그인</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.linkRow}
              onPress={() => router.replace('/(auth)/register')}
              accessibilityRole="link"
              accessibilityLabel="회원가입으로 이동"
            >
              <Text style={styles.linkText}>계정이 없으신가요? </Text>
              <Text style={styles.linkAccent}>회원가입</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.white,
  },
  hero: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.white,
    justifyContent: 'flex-end',
  },
  formArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  blobLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  blobOuter: {
    position: 'absolute',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blobMid: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blobInner: {
    borderRadius: 999,
  },
  heroText: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  brand: {
    fontSize: 41,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.subhead,
    fontWeight: '300',
    color: colors.text2,
    marginTop: 4,
  },
  whiteFade: {
    ...StyleSheet.absoluteFillObject,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
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
  error: {
    color: colors.red,
    fontSize: fontSize.subhead,
    marginTop: 16,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
