import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { submitInbody, getApiErrorMessage } from '@/services/api';
import type { InBodyRecord } from '@/types';

interface InBodyModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (record: InBodyRecord) => void;
}

export function InBodyModal({ visible, onClose, onSave }: InBodyModalProps) {
  const [weight, setWeight] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [bodyWater, setBodyWater] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const w = parseFloat(weight);
    const m = parseFloat(muscleMass);
    const f = parseFloat(bodyFat);
    const bw = parseFloat(bodyWater);

    if (!weight && !muscleMass && !bodyFat && !bodyWater) {
      setError('최소 하나의 수치를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const record = await submitInbody({
        weight_kg: isNaN(w) ? undefined : w,
        muscle_mass_kg: isNaN(m) ? undefined : m,
        body_fat_percent: isNaN(f) ? undefined : f,
        body_water_percent: isNaN(bw) ? undefined : bw,
        measured_at: new Date().toISOString(),
      });
      clearFields();
      onSave?.(record);
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const clearFields = () => {
    setWeight('');
    setMuscleMass('');
    setBodyFat('');
    setBodyWater('');
    setError('');
  };

  const handleClose = () => {
    clearFields();
    onClose();
  };

  const FIELDS = [
    { label: '체중 (kg)', placeholder: '62.4', value: weight, onChange: setWeight },
    { label: '골격근량 (kg)', placeholder: '28.1', value: muscleMass, onChange: setMuscleMass },
    { label: '체지방률 (%)', placeholder: '22.5', value: bodyFat, onChange: setBodyFat },
    { label: '체수분 (%)', placeholder: '55.0', value: bodyWater, onChange: setBodyWater },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />
          <Text style={styles.title}>⚖️ 인바디 수치 입력</Text>
          <Text style={styles.sub}>오늘 측정한 수치를 입력해주세요</Text>
          <View style={styles.grid}>
            {FIELDS.map((field) => (
              <View key={field.label} style={styles.field}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.text3}
                  value={field.value}
                  onChangeText={field.onChange}
                />
              </View>
            ))}
          </View>
          {error !== '' && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 11 },
  field: { width: '47%' },
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
  errorText: { fontSize: fontSize.xs, color: '#e57373', textAlign: 'center', marginBottom: 6 },
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
