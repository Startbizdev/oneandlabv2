import { useQuery } from '@tanstack/react-query';
import { NOTIFICATION_POLL_INTERVAL_MS } from '@oneandlab/shared-constants';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { fetchUnreadNotificationsCount } from '../api/notifications.service';

export function useUnreadNotificationsCount() {
  const token = useAuthStore((s) => s.token);
  const q = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: fetchUnreadNotificationsCount,
    enabled: Boolean(token),
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    staleTime: 0,
  });
  return q.data ?? 0;
}
