import { useQuery } from '@tanstack/react-query';
import { NOTIFICATION_POLL_INTERVAL_MS } from '@oneandlab/shared-constants';
import { queryKeys } from '@/lib/query-keys';
import { fetchNotifications } from '../api/notifications.service';
import { useAuthStore } from '@/store/auth-store';
import { foregroundRefetchInterval } from '@/lib/focused-refetch-interval';
import { useAppActive } from '@/lib/hooks/use-app-active';

/** Monté à la racine (rafraîchissement RDV) : jamais conditionné au focus d'un écran. */
export function useNotificationPolling(enabled = true) {
  const token = useAuthStore((s) => s.token);
  const appActive = useAppActive();
  return useQuery({
    queryKey: queryKeys.notifications.list(10),
    queryFn: async () => {
      const res = await fetchNotifications(10);
      if (!res.success) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: enabled && Boolean(token),
    refetchInterval: foregroundRefetchInterval(NOTIFICATION_POLL_INTERVAL_MS, appActive),
    refetchIntervalInBackground: false,
  });
}
