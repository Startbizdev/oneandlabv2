import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

/**
 * TODO(backend): endpoint d'enregistrement push non trouvé dans backend/api/
 * Ne pas appeler tant que la route n'existe pas. Voir backend/api/notifications/
 */
export async function registerPushTokenWithBackend(_expoPushToken: string): Promise<void> {
  // await api.post('/notifications/device-token', { token: _expoPushToken, platform: Platform.OS });
  return;
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

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}
