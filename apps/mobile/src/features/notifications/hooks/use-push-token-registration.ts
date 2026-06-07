import { useEffect } from 'react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  obtainExpoPushToken,
  registerPushTokenWithBackend,
} from '../services/push-token.service';
import { useAuthStore } from '@/store/auth-store';
import { useAppPreferencesStore } from '@/store/app-preferences-store';

/** Push désactivé dans Expo Go (SDK 53+) — nécessite un development build. */
export function usePushTokenRegistration() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const pushEnabled = useAppPreferencesStore((s) => s.pushNotificationsEnabled);
  const setExpoPushToken = useAppPreferencesStore((s) => s.setExpoPushToken);

  useEffect(() => {
    if (!isHydrated || !token || !pushEnabled) return;
    if (Constants.appOwnership === 'expo') return;
    if (!Device.isDevice) return;

    void (async () => {
      try {
        const pushToken = await obtainExpoPushToken();
        if (pushToken) {
          await registerPushTokenWithBackend(pushToken);
          setExpoPushToken(pushToken);
        }
      } catch {
        /* push non critique */
      }
    })();
  }, [token, isHydrated, pushEnabled, setExpoPushToken]);
}
