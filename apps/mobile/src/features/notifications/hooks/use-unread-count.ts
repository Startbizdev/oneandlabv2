import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchNotifications } from '../api/notifications.service';

export function useUnreadNotificationsCount() {
  const q = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: async () => {
      const res = await fetchNotifications(50);
      const list = res.data ?? [];
      return list.filter((n) => !(n as { read_at?: string }).read_at).length;
    },
    refetchInterval: 10_000,
  });
  return q.data ?? 0;
}
