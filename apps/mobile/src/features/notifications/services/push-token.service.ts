import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { api } from '@/api/client';

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (!Device.isDevice) return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function requestPushNotificationPermission(): Promise<PushPermissionStatus> {
  if (!Device.isDevice) return 'denied';

  const current = await getPushPermissionStatus();
  if (current === 'granted') return 'granted';

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export function openNotificationSettings(): void {
  void Linking.openSettings();
}

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

  const permission = await requestPushNotificationPermission();
  if (permission !== 'granted') return null;

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
