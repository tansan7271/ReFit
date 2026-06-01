import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { getApiErrorMessage, updateProfile } from '@/services/api';
import type { User } from '@/types';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  currentNickname: string;
  currentAge?: number;
}

export function ProfileEditModal({
  visible,
  onClose,
  onSave,
  currentNickname,
  currentAge,
}: ProfileEditModalProps) {
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setNickname(currentNickname ?? '');
      setAge(currentAge != null ? String(currentAge) : '');
    }
  }, [visible, currentNickname, currentAge]);

  const handleSave = async () => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      Alert.alert('알림', '닉네임을 입력해 주세요.');
      return;
    }

    const payload: { nickname: string; age?: number } = { nickname: trimmedNickname };
    if (age.trim()) {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 100) {
        Alert.alert('알림', '나이는 10세에서 100세 사이로 입력해 주세요.');
        return;
      }
      payload.age = parsedAge;
    }

    setSaving(true);
    try {
      const updated = await updateProfile(payload);
      onSave(updated);
      onClose();
    } catch (e) {
      Alert.alert('오류', getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} disabled={saving}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />
          <Text style={styles.title}>👤 프로필 수정</Text>
          <Text style={styles.sub}>닉네임과 나이를 변경할 수 있어요</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>닉네임</Text>
            <TextInput
              style={styles.input}
              placeholder="닉네임"
              placeholderTextColor={colors.text3}
              value={nickname}
              onChangeText={setNickname}
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>나이</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 28"
              placeholderTextColor={colors.text3}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
              maxLength={3}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>저장하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,46,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    marginBottom: 3,
    textAlign: 'center',
  },
  sub: {
    fontSize: fontSize.xs,
    color: colors.text3,
    marginBottom: 14,
    textAlign: 'center',
    lineHeight: 15,
  },
  field: { marginBottom: 11 },
  fieldLabel: {
    fontSize: fontSize.xs,
    color: colors.text2,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.card,
  },
  actions: { flexDirection: 'row', gap: 7, marginTop: 7 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  cancelText: { fontSize: 13, fontWeight: fontWeight.bold, color: colors.text2 },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveText: { fontSize: 13, fontWeight: fontWeight.heavy, color: '#fff' },
});
