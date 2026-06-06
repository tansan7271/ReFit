import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, spacing } from '@/constants/typography';
import { login, getApiErrorMessage } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const session = await login(email.trim(), password);
      await setSession(session.accessToken, session.refreshToken, session.user);
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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.logo}>🐣</Text>
            <Text style={styles.title}>ReFit</Text>
            <Text style={styles.subtitle}>운동 루틴을 함께 만들어가요</Text>
          </View>

          {/* 폼 */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="이메일을 입력해 주세요"
                placeholderTextColor={colors.text3}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="비밀번호를 입력해 주세요"
                placeholderTextColor={colors.text3}
                secureTextEntry
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error !== '' && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>로그인</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.registerLinkText}>
                계정이 없으신가요? <Text style={styles.registerLinkBold}>회원가입</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* 개발용 바로가기 — API 연동 확인 후 제거 */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.devBtn}
              onPress={() => router.replace('/(main)')}
              activeOpacity={0.8}
            >
              <Text style={styles.devBtnText}>🛠 개발용 메인 바로가기</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  kav: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center', gap: 28 },
  header: { alignItems: 'center', gap: 6 },
  logo: { fontSize: 52 },
  title: { fontSize: 26, fontWeight: fontWeight.black, color: colors.accent, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, color: colors.text3 },
  form: { gap: 12 },
  fieldGroup: { gap: 5 },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.text2 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.card,
  },
  errorText: { fontSize: fontSize.xs, color: '#e57373', textAlign: 'center' },
  loginBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.heavy, color: '#fff' },
  registerLink: { alignItems: 'center', paddingVertical: 4 },
  registerLinkText: { fontSize: fontSize.sm, color: colors.text3 },
  registerLinkBold: { color: colors.accent, fontWeight: fontWeight.bold },
  devBtn: {
    alignSelf: 'center',
    backgroundColor: colors.softBlue,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  devBtnText: { fontSize: fontSize.xs, color: colors.accent, fontWeight: fontWeight.bold },
});
