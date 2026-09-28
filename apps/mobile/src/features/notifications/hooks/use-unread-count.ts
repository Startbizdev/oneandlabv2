import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { NOTIFICATION_POLL_INTERVAL_MS } from '@oneandlab/shared-constants';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { fetchUnreadNotificationsCount } from '../api/notifications.service';

export function useUnreadNotificationsCount() {
  const token = useAuthStore((s) => s.token);
  const focused = useIsFocused();
  const appActive = useAppActive();
  const q = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: fetchUnreadNotificationsCount,
    enabled: Boolean(token),
    refetchInterval: focusedRefetchInterval(NOTIFICATION_POLL_INTERVAL_MS, focused, appActive),
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    staleTime: 0,
  });
  return q.data ?? 0;
}
