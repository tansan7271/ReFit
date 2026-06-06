import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { getApiErrorMessage, updateProfile } from '@/services/api';
import type { Gender, ProfileUpdatePayload, User } from '@/types';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  currentNickname: string;
  currentAge?: number;
  currentGender?: Gender | null;
  currentHeight?: number | null;
  currentWeight?: number | null;
}

export function ProfileEditModal({
  visible,
  onClose,
  onSave,
  currentNickname,
  currentAge,
  currentGender,
  currentHeight,
  currentWeight,
}: ProfileEditModalProps) {
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setNickname(currentNickname ?? '');
      setAge(currentAge != null ? String(currentAge) : '');
      setGender(currentGender ?? null);
      setHeight(currentHeight != null ? String(currentHeight) : '');
      setWeight(currentWeight != null ? String(currentWeight) : '');
    }
  }, [visible, currentNickname, currentAge, currentGender, currentHeight, currentWeight]);

  const handleSave = async () => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      Alert.alert('알림', '닉네임을 입력해 주세요.');
      return;
    }

    const payload: ProfileUpdatePayload = { nickname: trimmedNickname };
    if (age.trim()) {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 100) {
        Alert.alert('알림', '나이는 10세에서 100세 사이로 입력해 주세요.');
        return;
      }
      payload.age = parsedAge;
    }

    let parsedHeight: number | undefined;
    if (height.trim()) {
      parsedHeight = parseFloat(height);
      if (isNaN(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
        Alert.alert('알림', '키는 100cm에서 250cm 사이로 입력해 주세요.');
        return;
      }
    }

    let parsedWeight: number | undefined;
    if (weight.trim()) {
      parsedWeight = parseFloat(weight);
      if (isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 200) {
        Alert.alert('알림', '몸무게는 30kg에서 200kg 사이로 입력해 주세요.');
        return;
      }
    }

    if (gender !== null) payload.gender = gender;
    if (parsedHeight !== undefined) payload.height_cm = parsedHeight;
    if (parsedWeight !== undefined) payload.weight_kg = parsedWeight;

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
          <Text style={styles.sub}>기본 프로필 정보를 변경할 수 있어요</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
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

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>성별</Text>
              <View style={styles.genderRow}>
                {([['male', '남성'], ['female', '여성'], ['other', '선택안함']] as [Gender, string][]).map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.genderBtn, gender === val && styles.genderBtnActive]}
                    onPress={() => setGender(gender === val ? null : val)}
                  >
                    <Text style={[styles.genderBtnText, gender === val && styles.genderBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>키</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="예: 175"
                  placeholderTextColor={colors.text3}
                  keyboardType="decimal-pad"
                  value={height}
                  onChangeText={setHeight}
                  maxLength={5}
                />
                <Text style={styles.unitText}>cm</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>몸무게</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="예: 70"
                  placeholderTextColor={colors.text3}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                  maxLength={5}
                />
                <Text style={styles.unitText}>kg</Text>
              </View>
            </View>
          </ScrollView>

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
  genderRow: { flexDirection: 'row', gap: 7 },
  genderBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.softBlue,
  },
  genderBtnText: { fontSize: 12, fontWeight: fontWeight.bold, color: colors.text2 },
  genderBtnTextActive: { color: colors.accent },
  inputWithUnit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitText: { fontSize: 13, color: colors.text2, fontWeight: fontWeight.bold, minWidth: 20 },
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
