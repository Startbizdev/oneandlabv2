import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { NOTIFICATION_POLL_INTERVAL_MS } from '@oneandlab/shared-constants';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_PAGE_SIZE,
  type AppNotification,
} from '@/features/notifications/api/notifications.service';
import { NotificationsFeed } from '@/features/notifications/components/NotificationsFeed';
import { NotificationsReadAllAction } from '@/features/notifications/components/NotificationsReadAllAction';
import { useAuthStore } from '@/store/auth-store';
import {
  decrementUnreadNotificationsCount,
  setUnreadNotificationsCount,
} from '../lib/notifications-cache';
import { resolveNotificationNavigation } from '../utils/notification-navigation';
import { usePharmacyModuleEnabled } from '@/features/pharmacy-orders/hooks/use-pharmacy-module-enabled';
import { useStyles, type Theme } from '@/theme';

const FEED_QUERY_KEY = queryKeys.notifications.feed(NOTIFICATIONS_PAGE_SIZE);

export function NotificationsScreen() {
  const styles = useStyles(buildStyles);

  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const token = useAuthStore((s) => s.token);
  const focused = useIsFocused();
  const appActive = useAppActive();
  const { canReceive: pharmacyCanReceive } = usePharmacyModuleEnabled();

  const feedQ = useInfiniteQuery({
    queryKey: FEED_QUERY_KEY,
    queryFn: async ({ pageParam = 0 }) => {
      const page = await fetchNotificationsPage(NOTIFICATIONS_PAGE_SIZE, pageParam);
      return {
        ...page,
        nextOffset: page.pagination.has_more
          ? pageParam + NOTIFICATIONS_PAGE_SIZE
          : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: Boolean(token),
    refetchInterval: focusedRefetchInterval(NOTIFICATION_POLL_INTERVAL_MS, focused, appActive),
    refetchIntervalInBackground: false,
  });

  const items = useMemo(
    () => feedQ.data?.pages.flatMap((p) => p.items) ?? [],
    [feedQ.data?.pages],
  );

  const hasUnread = items.some((n) => !n.read_at);

  const invalidateFeed = useCallback(() => {
    void qc.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    void qc.invalidateQueries({ queryKey: queryKeys.notifications.unread });
  }, [qc]);

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onMutate: (id) => {
      const wasUnread = items.some((n) => n.id === id && !n.read_at);
      const prev = qc.getQueryData(FEED_QUERY_KEY);
      if (wasUnread) {
        decrementUnreadNotificationsCount(qc);
        const now = new Date().toISOString();
        qc.setQueryData(FEED_QUERY_KEY, (old: typeof feedQ.data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? now } : n)),
            })),
          };
        });
      }
      return { wasUnread, prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.wasUnread) {
        if (ctx.prev) qc.setQueryData(FEED_QUERY_KEY, ctx.prev);
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.unread });
      }
    },
    onSuccess: invalidateFeed,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await markAllNotificationsRead();
      if (!res.success) {
        throw new Error(res.error ?? 'Impossible de tout marquer comme lu');
      }
      return res.data?.marked ?? 0;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: FEED_QUERY_KEY });
      await qc.cancelQueries({ queryKey: queryKeys.notifications.unread });
      const prev = qc.getQueryData(FEED_QUERY_KEY);
      const prevUnread = qc.getQueryData(queryKeys.notifications.unread);
      setUnreadNotificationsCount(qc, 0);
      qc.setQueryData(FEED_QUERY_KEY, (old: typeof feedQ.data) => {
        if (!old) return old;
        const now = new Date().toISOString();
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((n) => ({ ...n, read_at: n.read_at ?? now })),
          })),
        };
      });
      return { prev, prevUnread };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(FEED_QUERY_KEY, ctx.prev);
      if (ctx?.prevUnread !== undefined) {
        qc.setQueryData(queryKeys.notifications.unread, ctx.prevUnread);
      }
    },
    onSettled: invalidateFeed,
  });

  const headerRightNode = hasUnread ? (
    <NotificationsReadAllAction
      onPress={() => markAllRead.mutate()}
      loading={markAllRead.isPending}
    />
  ) : null;

  const onPressItem = useCallback(
    (n: AppNotification) => {
      if (!n.read_at) markRead.mutate(n.id);
      const target = resolveNotificationNavigation(n, role, { pharmacyCanReceive });
      if (target.kind === 'route') {
        router.push({
          pathname: target.pathname,
          params: target.params,
        } as never);
      }
    },
    [markRead, pharmacyCanReceive, role, router],
  );

  return (
    <StackChromeScreen headerRight={headerRightNode}>
      <View style={styles.container}>
        <NotificationsFeed
          query={feedQ}
          items={items}
          pageSize={NOTIFICATIONS_PAGE_SIZE}
          onPressItem={onPressItem}
        />
      </View>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    container: {
      minWidth: 0,
      flex: 1,
      backgroundColor: c.background,
    },
  };
}
