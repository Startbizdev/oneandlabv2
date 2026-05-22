import { useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import type { Appointment } from '@oneandlab/shared-types';
import { useAuthStore } from '@/store/auth-store';
import { useOfferQueueStore } from '../store/offer-queue-store';

/** Enqueue pending offers when screen focused (demandes / liste préleveur). */
export function useOfferQueueSync(appointments: Appointment[] | undefined, enabled: boolean) {
  const user = useAuthStore((s) => s.user);
  const enqueueMany = useOfferQueueStore((s) => s.enqueueMany);
  const processNext = useOfferQueueStore((s) => s.processNext);

  const sync = useCallback(() => {
    if (!enabled || !appointments?.length || !user?.role || !user.id) return;
    enqueueMany(appointments);
    void processNext(user.role, user.id);
  }, [appointments, enabled, enqueueMany, processNext, user?.role, user?.id]);

  useFocusEffect(
    useCallback(() => {
      sync();
      return undefined;
    }, [sync]),
  );

  useEffect(() => {
    sync();
  }, [sync]);
}
