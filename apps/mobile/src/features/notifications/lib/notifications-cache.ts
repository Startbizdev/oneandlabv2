import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export function setUnreadNotificationsCount(qc: QueryClient, count: number) {
  qc.setQueryData(queryKeys.notifications.unread, count);
}

export function decrementUnreadNotificationsCount(qc: QueryClient) {
  qc.setQueryData(queryKeys.notifications.unread, (old: unknown) => {
    const n = typeof old === 'number' ? old : 0;
    return Math.max(0, n - 1);
  });
}
