import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Switch,
  Text,
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

export function NotificationSettingsModal({ visible, onClose }: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
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
    } catch (e) {
      console.warn('알림 설정을 변경하지 못했어요', e);
      setSettings(prev);
      Alert.alert('알림', '설정을 변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
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

              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>운동 알림 시간</Text>
                <Text style={styles.timeValue}>{settings.workout_reminder_time ?? '미설정'}</Text>
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>수면 알림 시간</Text>
                <Text style={styles.timeValue}>{settings.sleep_reminder_time ?? '미설정'}</Text>
              </View>
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
