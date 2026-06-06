import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { getApiErrorMessage, updateProfile } from '@/services/api';
import type { FitnessLevel, User } from '@/types';

interface FitnessLevelEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  currentLevel: FitnessLevel | null;
}

const OPTIONS: { level: FitnessLevel; title: string; desc: string }[] = [
  { level: 'beginner', title: '초보자', desc: '헬스장 처음 등록 (3개월 미만)' },
  { level: 'intermediate', title: '중급자', desc: '분할 루틴 소화 (1–3년)' },
  { level: 'advanced', title: '숙련자', desc: '몸 상태 정확히 파악 (3년 이상)' },
  { level: 'athlete', title: '운동선수급', desc: '전문적인 훈련 수준' },
];

export function FitnessLevelEditModal({
  visible,
  onClose,
  onSave,
  currentLevel,
}: FitnessLevelEditModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<FitnessLevel>('beginner');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedLevel(currentLevel ?? 'beginner');
    }
  }, [visible, currentLevel]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({ fitness_level: selectedLevel });
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
          <Text style={styles.title}>💪 운동 숙련도</Text>
          <Text style={styles.sub}>나에게 맞는 숙련도를 선택해 주세요</Text>

          <View style={styles.options}>
            {OPTIONS.map((opt) => {
              const selected = opt.level === selectedLevel;
              return (
                <TouchableOpacity
                  key={opt.level}
                  style={[styles.option, selected && styles.optionSelected]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedLevel(opt.level)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                      {opt.title}
                    </Text>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </View>
                  {selected && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
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
  options: { gap: 8, marginBottom: 7 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: colors.card,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.softBlue,
  },
  optionTitle: { fontSize: 13, fontWeight: fontWeight.heavy, color: colors.text },
  optionTitleSelected: { color: colors.accent },
  optionDesc: { fontSize: fontSize.xs, color: colors.text2, marginTop: 2 },
  check: { fontSize: 16, fontWeight: fontWeight.heavy, color: colors.accent },
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
