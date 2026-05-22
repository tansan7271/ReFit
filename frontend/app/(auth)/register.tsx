import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { register, getApiErrorMessage } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!nickname.trim() || !email.trim() || !password) {
      setError('모든 항목을 입력해 주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않아요.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 해요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const session = await register(email.trim(), password, nickname.trim());
      await setSession(session.accessToken, session.refreshToken, session.user);
      router.replace('/(onboarding)');
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
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={styles.logo}>🐣</Text>
              <Text style={styles.title}>회원가입</Text>
              <Text style={styles.subtitle}>리핏과 함께 운동을 시작해요</Text>
            </View>

            {/* 폼 */}
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>닉네임</Text>
                <TextInput
                  style={styles.input}
                  placeholder="닉네임을 입력해 주세요"
                  placeholderTextColor={colors.text3}
                  autoCapitalize="none"
                  textContentType="nickname"
                  value={nickname}
                  onChangeText={setNickname}
                />
              </View>

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
                  placeholder="8자 이상 입력해 주세요"
                  placeholderTextColor={colors.text3}
                  secureTextEntry
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>비밀번호 확인</Text>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호를 다시 입력해 주세요"
                  placeholderTextColor={colors.text3}
                  secureTextEntry
                  textContentType="newPassword"
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                />
              </View>

              {error !== '' && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
                onPress={handleRegister}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerBtnText}>가입하기</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.back()}
              >
                <Text style={styles.loginLinkText}>
                  이미 계정이 있어요 <Text style={styles.loginLinkBold}>로그인</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  kav: { flex: 1 },
  scroll: { flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center', gap: 28, paddingVertical: 32 },
  header: { alignItems: 'center', gap: 6 },
  logo: { fontSize: 52 },
  title: { fontSize: 24, fontWeight: fontWeight.black, color: colors.accent, letterSpacing: -0.5 },
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
  registerBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  registerBtnDisabled: { opacity: 0.6 },
  registerBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.heavy, color: '#fff' },
  loginLink: { alignItems: 'center', paddingVertical: 4 },
  loginLinkText: { fontSize: fontSize.sm, color: colors.text3 },
  loginLinkBold: { color: colors.accent, fontWeight: fontWeight.bold },
});
