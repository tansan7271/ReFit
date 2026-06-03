import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight } from '@/constants/typography';
import { getHealthProviderInfo, requestHealthPermissions } from '@/services/health';

type LinkState = 'idle' | 'linking' | 'success' | 'error';

interface HealthConnectModalProps {
  visible: boolean;
  onClose: () => void;
}

const provider = getHealthProviderInfo();

export function HealthConnectModal({ visible, onClose }: HealthConnectModalProps) {
  const [linkState, setLinkState] = useState<LinkState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setLinkState('idle');
      setMessage('');
    }
  }, [visible]);

  const handleReconnect = async () => {
    setLinkState('linking');
    setMessage('');
    const result = await requestHealthPermissions();
    if (result.granted) {
      setLinkState('success');
      setMessage('연동 완료! ✅');
    } else {
      setLinkState('error');
      setMessage('연동에 실패했어요. 설정에서 권한을 확인해 주세요.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />
          <Text style={styles.title}>📱 헬스 앱 연동 상태</Text>
          <Text style={styles.sub}>{provider.description}</Text>

          <View
            style={[styles.card, linkState === 'success' && styles.cardLinked]}
          >
            <Text style={styles.platformIcon}>
              {Platform.OS === 'ios' ? '🍎' : '🤖'}
            </Text>
            <View style={styles.cardText}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerDesc}>
                {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}
              </Text>
            </View>
            {linkState === 'success' ? (
              <Text style={styles.linkedBadge}>연동됨</Text>
            ) : null}
          </View>

          {linkState === 'success' ? (
            <Text style={styles.successText}>{message}</Text>
          ) : null}
          {linkState === 'error' ? (
            <Text style={styles.errorText}>{message}</Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={linkState === 'linking'}
            >
              <Text style={styles.cancelText}>닫기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reconnectBtn, linkState === 'linking' && { opacity: 0.6 }]}
              onPress={handleReconnect}
              disabled={linkState === 'linking'}
            >
              {linkState === 'linking' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.reconnectText}>다시 연동하기</Text>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  cardLinked: {
    borderColor: colors.green,
    backgroundColor: colors.softGreen,
  },
  platformIcon: { fontSize: 28 },
  cardText: { flex: 1 },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  providerDesc: {
    fontSize: fontSize.xs,
    color: colors.text2,
    lineHeight: 16,
  },
  linkedBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.green,
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.green,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.accent2,
    fontWeight: fontWeight.semibold,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
  },
  actions: { flexDirection: 'row', gap: 7, marginTop: 16 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  cancelText: { fontSize: 13, fontWeight: fontWeight.bold, color: colors.text2 },
  reconnectBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  reconnectText: { fontSize: 13, fontWeight: fontWeight.heavy, color: '#fff' },
});
