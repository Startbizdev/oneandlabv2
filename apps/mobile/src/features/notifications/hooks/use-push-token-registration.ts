import { useEffect } from 'react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  obtainExpoPushToken,
  registerPushTokenWithBackend,
} from '../services/push-token.service';
import { useAuthStore } from '@/store/auth-store';

/** Push désactivé dans Expo Go (SDK 53+) — nécessite un development build. */
export function usePushTokenRegistration() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated || !token) return;
    if (Constants.appOwnership === 'expo') return;
    if (!Device.isDevice) return;

    void (async () => {
      try {
        const pushToken = await obtainExpoPushToken();
        if (pushToken) await registerPushTokenWithBackend(pushToken);
      } catch {
        /* push non critique */
      }
    })();
  }, [token, isHydrated]);
}
