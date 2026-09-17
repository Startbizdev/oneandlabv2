import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notificationShouldRefreshAppointmentsList } from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { useNotificationPolling } from '@/features/notifications/hooks/use-notification-polling';
import { useAuthStore } from '@/store/auth-store';

/**
 * Invalide le cache RDV quand une notification pertinente arrive (polling).
 */
export function useAppointmentsRefreshOnNotifications(enabled = true) {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const { data } = useNotificationPolling(enabled && Boolean(token));
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !data?.length) return;

    if (!initializedRef.current) {
      seenIdsRef.current = new Set(data.map((n) => String(n.id)));
      initializedRef.current = true;
      return;
    }

    let shouldRefresh = false;
    for (const n of data) {
      const id = String(n.id);
      if (seenIdsRef.current.has(id)) continue;
      seenIdsRef.current.add(id);
      if (notificationShouldRefreshAppointmentsList(n.type, n.data)) {
        shouldRefresh = true;
      }
    }

    if (shouldRefresh) {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
    }
  }, [data, enabled, qc]);
}
