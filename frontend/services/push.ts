import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken } from '@/services/api';

export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as any)?.eas?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : {}
  );
  const token = tokenData.data;

  await registerPushToken(token, Platform.OS);
}
