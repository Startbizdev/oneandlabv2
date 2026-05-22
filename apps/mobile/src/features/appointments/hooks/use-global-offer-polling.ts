import { useEffect, useRef } from 'react';
import { usePendingOffersPoll } from '@/features/appointments/hooks/use-pending-offers-poll';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { useAuthStore } from '@/store/auth-store';

/**
 * Polling offres entrantes + file FIFO (aligné dashboard.vue : enqueue uniquement les nouveaux IDs).
 */
export function useGlobalOfferPolling() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const enabled = role === 'nurse';
  const seenIds = useRef(new Set<string>());
  const bootstrapped = useRef(false);

  const { data: pending } = usePendingOffersPoll(enabled);
  const enqueueMany = useOfferQueueStore((s) => s.enqueueMany);
  const processNext = useOfferQueueStore((s) => s.processNext);

  useEffect(() => {
    if (!enabled || !pending || !user?.id || !role) return;

    if (!bootstrapped.current) {
      bootstrapped.current = true;
      pending.forEach((a) => {
        if (a?.id) seenIds.current.add(a.id);
      });
      if (pending.length > 0) {
        enqueueMany(pending);
        void processNext(role, user.id);
      }
      return;
    }

    const fresh = pending.filter((a) => a?.id && !seenIds.current.has(a.id));
    if (fresh.length === 0) return;
    fresh.forEach((a) => {
      if (a?.id) seenIds.current.add(a.id);
    });
    enqueueMany(fresh);
    void processNext(role, user.id);
  }, [enabled, enqueueMany, pending, processNext, role, user?.id]);
}
