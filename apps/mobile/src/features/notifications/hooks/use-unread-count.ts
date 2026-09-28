import { useQuery } from '@tanstack/react-query';
import { NOTIFICATION_POLL_INTERVAL_MS } from '@oneandlab/shared-constants';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { foregroundRefetchInterval } from '@/lib/focused-refetch-interval';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { fetchUnreadNotificationsCount } from '../api/notifications.service';

/** Badge cloche : doit suivre les nouvelles notifications quel que soit l'écran affiché. */
export function useUnreadNotificationsCount() {
  const token = useAuthStore((s) => s.token);
  const appActive = useAppActive();
  const q = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: fetchUnreadNotificationsCount,
    enabled: Boolean(token),
    refetchInterval: foregroundRefetchInterval(NOTIFICATION_POLL_INTERVAL_MS, appActive),
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    staleTime: 0,
  });
  return q.data ?? 0;
}
