import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { TimeField } from '@/components/ui/TimeField';
import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { fetchMe, getApiErrorMessage, updateSleepGoal } from '@/services/api';
import type { User } from '@/types';

interface SleepGoalEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  currentBedtime: string | null;
  currentWakeup: string | null;
}

/** "HH:mm" → 자정 기준 분 */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 취침→기상 수면 시간(분). 자정을 넘기는 경우 처리 */
function sleepDuration(bed: string, wake: string): number {
  const diff = toMinutes(wake) - toMinutes(bed);
  return diff <= 0 ? diff + 24 * 60 : diff;
}

export function SleepGoalEditModal({
  visible,
  onClose,
  onSave,
  currentBedtime,
  currentWakeup,
}: SleepGoalEditModalProps) {
  const [bedtime, setBedtime] = useState('23:30');
  const [wakeup, setWakeup] = useState('07:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setBedtime(currentBedtime ?? '23:30');
      setWakeup(currentWakeup ?? '07:00');
    }
  }, [visible, currentBedtime, currentWakeup]);

  const sameTime = bedtime === wakeup;

  const durationLabel = useMemo(() => {
    const mins = sleepDuration(bedtime, wakeup);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
  }, [bedtime, wakeup]);

  const handleSave = async () => {
    if (sameTime) return;
    setSaving(true);
    try {
      await updateSleepGoal(bedtime, wakeup);
      const updated = await fetchMe();
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
          <Text style={styles.title}>🌙 수면 목표</Text>
          <Text style={styles.sub}>취침·기상 시각으로 목표 수면 시간을 정해요</Text>

          <View style={styles.fields}>
            <TimeField label="취침 시간" value={bedtime} onChange={setBedtime} />
            <TimeField label="기상 시간" value={wakeup} onChange={setWakeup} />
          </View>

          {sameTime ? (
            <Text style={styles.warning}>취침 시각과 기상 시각이 같을 수 없어요</Text>
          ) : (
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>목표 수면 시간</Text>
              <Text style={styles.summaryValue}>{durationLabel}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (saving || sameTime) && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving || sameTime}
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
  fields: { gap: 10, marginBottom: 12 },
  summary: {
    backgroundColor: colors.softBlue,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    marginBottom: 7,
  },
  summaryLabel: { fontSize: fontSize.sm, color: colors.text2 },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    color: colors.accent,
  },
  warning: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.heavy,
    color: colors.pink,
    textAlign: 'center',
    paddingVertical: 14,
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
