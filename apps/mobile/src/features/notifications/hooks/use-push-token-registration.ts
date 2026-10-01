import { useEffect } from 'react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  getPushPermissionStatus,
  obtainExpoPushTokenIfGranted,
  registerPushTokenWithBackend,
} from '../services/push-token.service';
import { useAuthStore } from '@/store/auth-store';
import { useAppPreferencesStore } from '@/store/app-preferences-store';

/**
 * Enregistre le token push quand la permission système est déjà accordée.
 * Ne déclenche jamais la fenêtre système : la demande passe par `PushPermissionPrompt`
 * ou par le réglage Notifications. Push désactivé dans Expo Go (SDK 53+).
 */
export function usePushTokenRegistration() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const pushEnabled = useAppPreferencesStore((s) => s.pushNotificationsEnabled);
  const setPushEnabled = useAppPreferencesStore((s) => s.setPushNotificationsEnabled);
  const setExpoPushToken = useAppPreferencesStore((s) => s.setExpoPushToken);

  useEffect(() => {
    if (!isHydrated || !token || !pushEnabled) return;
    if (Constants.appOwnership === 'expo') return;
    if (!Device.isDevice) return;

    void (async () => {
      try {
        const status = await getPushPermissionStatus();
        if (status === 'denied') {
          setPushEnabled(false);
          return;
        }
        const pushToken = await obtainExpoPushTokenIfGranted();
        if (pushToken) {
          await registerPushTokenWithBackend(pushToken);
          setExpoPushToken(pushToken);
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[push] enregistrement du token impossible', e);
        }
      }
    })();
  }, [token, isHydrated, pushEnabled, setPushEnabled, setExpoPushToken]);
}
