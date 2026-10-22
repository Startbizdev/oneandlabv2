import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notificationShouldRefreshAppointmentsList } from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { useNotificationPolling } from '@/features/notifications/hooks/use-notification-polling';
import { useAuthStore } from '@/store/auth-store';

export type NotificationRefreshTracker = { initialized: boolean; seenIds: Set<string> };

type PolledNotification = { id: string | number; type?: string | null; data?: unknown };

/**
 * Premier relevé = déjà vu (même vide) ; ensuite, toute nouvelle notification liée à un RDV
 * (« RDV confirmé », etc.) demande un rafraîchissement des listes.
 */
export function shouldRefreshAppointmentsFromNotifications(
  tracker: NotificationRefreshTracker,
  data: readonly PolledNotification[],
): boolean {
  if (!tracker.initialized) {
    tracker.seenIds = new Set(data.map((n) => String(n.id)));
    tracker.initialized = true;
    return false;
  }

  let shouldRefresh = false;
  for (const n of data) {
    const id = String(n.id);
    if (tracker.seenIds.has(id)) continue;
    tracker.seenIds.add(id);
    if (notificationShouldRefreshAppointmentsList(n.type, n.data)) {
      shouldRefresh = true;
    }
  }
  return shouldRefresh;
}

/**
 * Invalide le cache RDV quand une notification pertinente arrive (polling).
 */
export function useAppointmentsRefreshOnNotifications(enabled = true) {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const { data } = useNotificationPolling(enabled && Boolean(token));
  const trackerRef = useRef<NotificationRefreshTracker>({ initialized: false, seenIds: new Set() });

  useEffect(() => {
    if (!enabled || !data) return;
    if (shouldRefreshAppointmentsFromNotifications(trackerRef.current, data)) {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
    }
  }, [data, enabled, qc]);
}
