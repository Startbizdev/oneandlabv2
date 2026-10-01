import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  getPushPermissionStatus,
  type PushPermissionStatus,
} from '@/features/notifications/services/push-token.service';

/** Autorisation système des notifications, relue au retour des réglages de l’appareil (sans jamais la demander). */
export function usePushPermissionStatus() {
  const [status, setStatus] = useState<PushPermissionStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getPushPermissionStatus());
    } catch (err) {
      console.warn('[settings] lecture de l’autorisation push impossible', err);
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { status, refresh };
}
