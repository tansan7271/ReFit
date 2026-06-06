import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { fetchNotificationSettings, updateNotificationSettings } from '@/services/api';
import type { NotificationSettings } from '@/types';

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSettingsChanged?: (settings: NotificationSettings) => void;
}

/** "HH:mm" 형식 + 유효 시각(시 0-23, 분 0-59) 검증 */
function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

type ToggleKey =
  | 'ai_coaching'
  | 'workout_reminder'
  | 'sleep_reminder'
  | 'friend_poke'
  | 'achievement';

const TOGGLE_ITEMS: { key: ToggleKey; label: string }[] = [
  { key: 'ai_coaching', label: 'AI 코칭' },
  { key: 'workout_reminder', label: '운동 알림' },
  { key: 'sleep_reminder', label: '수면 알림' },
  { key: 'friend_poke', label: '친구 콕 찌르기' },
  { key: 'achievement', label: '뱃지 달성' },
];

export function NotificationSettingsModal({
  visible,
  onClose,
  onSettingsChanged,
}: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTime, setEditingTime] = useState<'workout' | 'sleep' | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState('');
  const [savingTime, setSavingTime] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setEditingTime(null);
    fetchNotificationSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch((e) => console.warn('알림 설정을 불러오지 못했어요', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleToggle = async (key: ToggleKey, value: boolean) => {
    const prev = settings;
    if (!prev) return;
    setSettings({ ...prev, [key]: value });
    try {
      const updated = await updateNotificationSettings({ [key]: value });
      setSettings(updated);
      onSettingsChanged?.(updated);
    } catch (e) {
      console.warn('알림 설정을 변경하지 못했어요', e);
      setSettings(prev);
      Alert.alert('알림', '설정을 변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleTimeRowPress = (which: 'workout' | 'sleep') => {
    if (editingTime === which) {
      setEditingTime(null);
      return;
    }
    const current =
      which === 'workout'
        ? settings?.workout_reminder_time ?? '07:00'
        : settings?.sleep_reminder_time ?? '23:00';
    setEditingTimeValue(current);
    setEditingTime(which);
  };

  const handleSaveTime = async () => {
    if (!settings || !editingTime) return;
    if (!isValidTime(editingTimeValue)) {
      Alert.alert('알림', '시간을 07:00 형식(00:00~23:59)으로 입력해 주세요.');
      return;
    }
    const payload =
      editingTime === 'workout'
        ? { workout_reminder_time: editingTimeValue }
        : { sleep_reminder_time: editingTimeValue };
    setSavingTime(true);
    try {
      const updated = await updateNotificationSettings(payload);
      setSettings(updated);
      onSettingsChanged?.(updated);
      setEditingTime(null);
    } catch (e) {
      console.warn('알림 시간을 변경하지 못했어요', e);
      Alert.alert('알림', '시간을 변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSavingTime(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />
          <Text style={styles.title}>🔔 알림 설정</Text>
          <Text style={styles.sub}>원하는 알림만 켜고 끌 수 있어요</Text>

          {loading || !settings ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: 28 }} />
          ) : (
            <View>
              {TOGGLE_ITEMS.map((item) => (
                <View key={item.key} style={styles.row}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Switch
                    value={settings[item.key]}
                    onValueChange={(v) => handleToggle(item.key, v)}
                    trackColor={{ false: colors.border, true: colors.accent }}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={styles.timeRow}
                activeOpacity={0.7}
                onPress={() => handleTimeRowPress('workout')}
              >
                <Text style={styles.timeLabel}>운동 알림 시간</Text>
                <Text style={styles.timeValue}>{settings.workout_reminder_time ?? '미설정'}</Text>
              </TouchableOpacity>
              {editingTime === 'workout' && (
                <View style={styles.timeEditRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={editingTimeValue}
                    onChangeText={setEditingTimeValue}
                    keyboardType="numbers-and-punctuation"
                    placeholder="HH:mm"
                    placeholderTextColor={colors.text3}
                    maxLength={5}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.timeSaveBtn, savingTime && { opacity: 0.6 }]}
                    onPress={handleSaveTime}
                    disabled={savingTime}
                  >
                    {savingTime ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.timeSaveText}>저장</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.timeRow}
                activeOpacity={0.7}
                onPress={() => handleTimeRowPress('sleep')}
              >
                <Text style={styles.timeLabel}>수면 알림 시간</Text>
                <Text style={styles.timeValue}>{settings.sleep_reminder_time ?? '미설정'}</Text>
              </TouchableOpacity>
              {editingTime === 'sleep' && (
                <View style={styles.timeEditRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={editingTimeValue}
                    onChangeText={setEditingTimeValue}
                    keyboardType="numbers-and-punctuation"
                    placeholder="HH:mm"
                    placeholderTextColor={colors.text3}
                    maxLength={5}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.timeSaveBtn, savingTime && { opacity: 0.6 }]}
                    onPress={handleSaveTime}
                    disabled={savingTime}
                  >
                    {savingTime ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.timeSaveText}>저장</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>닫기</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 13, fontWeight: fontWeight.bold, color: colors.text },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeLabel: { fontSize: fontSize.xs, color: colors.text2, fontWeight: fontWeight.regular },
  timeValue: { fontSize: 13, fontWeight: fontWeight.bold, color: colors.text2 },
  timeEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.card,
  },
  timeSaveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  timeSaveText: { fontSize: 13, fontWeight: fontWeight.heavy, color: '#fff' },
  actions: { flexDirection: 'row', gap: 7, marginTop: 14 },
  closeBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  closeText: { fontSize: 13, fontWeight: fontWeight.heavy, color: '#fff' },
});
