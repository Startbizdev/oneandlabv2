import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { NOTIFICATION_POLL_INTERVAL_MS } from '@oneandlab/shared-constants';
import { queryKeys } from '@/lib/query-keys';
import { fetchNotifications } from '../api/notifications.service';
import { useAuthStore } from '@/store/auth-store';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { useAppActive } from '@/lib/hooks/use-app-active';

export function useNotificationPolling(enabled = true) {
  const token = useAuthStore((s) => s.token);
  const focused = useIsFocused();
  const appActive = useAppActive();
  return useQuery({
    queryKey: queryKeys.notifications.list(10),
    queryFn: async () => {
      const res = await fetchNotifications(10);
      if (!res.success) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: enabled && Boolean(token),
    refetchInterval: focusedRefetchInterval(NOTIFICATION_POLL_INTERVAL_MS, focused, appActive),
    refetchIntervalInBackground: false,
  });
}
