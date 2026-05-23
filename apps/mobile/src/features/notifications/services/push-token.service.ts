import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '@/api/client';

export async function registerPushTokenWithBackend(expoPushToken: string): Promise<void> {
  const res = await api.post('/notifications/device-token', {
    token: expoPushToken,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  if (res.success === false) {
    throw new Error(res.error ?? 'Enregistrement du token push impossible');
  }
}

export async function unregisterPushTokenWithBackend(expoPushToken: string): Promise<void> {
  try {
    await api.delete('/notifications/device-token', { token: expoPushToken });
  } catch {
    /* non bloquant */
  }
}

export async function obtainExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    if (__DEV__) {
      console.warn('[push] EAS projectId manquant — token push non généré');
    }
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}
