import { useCallback } from 'react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  getPushPermissionStatus,
  obtainExpoPushToken,
  registerPushTokenWithBackend,
} from '../services/push-token.service';
import { useAppPreferencesStore } from '@/store/app-preferences-store';

/** La fenêtre système n'a de sens que sur un vrai appareil, hors Expo Go, si l'OS n'a pas encore été sollicité. */
export async function shouldExplainPushPermission(): Promise<boolean> {
  if (Constants.appOwnership === 'expo' || !Device.isDevice) return false;
  return (await getPushPermissionStatus()) === 'undetermined';
}

/** Demande explicite (bouton « Activer ») puis enregistrement du token si l'OS accepte. */
export function usePushPermissionActivation() {
  const setPushEnabled = useAppPreferencesStore((s) => s.setPushNotificationsEnabled);
  const setExpoPushToken = useAppPreferencesStore((s) => s.setExpoPushToken);

  const activate = useCallback(async (): Promise<boolean> => {
    const pushToken = await obtainExpoPushToken();
    if (!pushToken) {
      setPushEnabled(false);
      return false;
    }
    setPushEnabled(true);
    await registerPushTokenWithBackend(pushToken);
    setExpoPushToken(pushToken);
    return true;
  }, [setExpoPushToken, setPushEnabled]);

  const decline = useCallback(() => {
    setPushEnabled(false);
  }, [setPushEnabled]);

  return { activate, decline };
}
