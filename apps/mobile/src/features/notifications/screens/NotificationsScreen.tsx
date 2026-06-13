import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing } from '@/theme';

const FEED_QUERY_KEY = queryKeys.notifications.feed(NOTIFICATIONS_PAGE_SIZE);

export function NotificationsScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_notifications_screens_NotificationsScreen_tsx_NotificationsScreen_styles');

  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const token = useAuthStore((s) => s.token);

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
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const items = useMemo(
    () => feedQ.data?.pages.flatMap((p) => p.items) ?? [],
    [feedQ.data?.pages],
  );

  const hasUnread = items.some((n) => !n.read_at);
  const hasMore = Boolean(feedQ.hasNextPage);

  const invalidateFeed = useCallback(() => {
    void qc.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    void qc.invalidateQueries({ queryKey: queryKeys.notifications.unread });
  }, [qc]);

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onMutate: (id) => {
      const wasUnread = items.some((n) => n.id === id && !n.read_at);
      if (wasUnread) decrementUnreadNotificationsCount(qc);
      return { wasUnread };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.wasUnread) {
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

  const headerRight = useCallback(
    () =>
      hasUnread ? (
        <NotificationsReadAllAction
          onPress={() => markAllRead.mutate()}
          loading={markAllRead.isPending}
        />
      ) : null,
    [hasUnread, markAllRead],
  );

  const onPressItem = useCallback(
    (n: AppNotification) => {
      if (!n.read_at) markRead.mutate(n.id);
      const target = resolveNotificationNavigation(n, role);
      if (target.kind === 'route') {
        router.push({
          pathname: target.pathname,
          params: target.params,
        } as never);
      }
    },
    [markRead, role, router],
  );

  const loadMore = useCallback(() => {
    if (feedQ.hasNextPage && !feedQ.isFetchingNextPage) {
      void feedQ.fetchNextPage();
    }
  }, [feedQ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight,
        }}
      />
      <View style={styles.container}>
        {feedQ.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={[styles.centered, styles.emptyPad]}>
            <EmptyState
              Icon={Bell}
              title="Aucune notification"
              description="Vos alertes rendez-vous et activité apparaîtront ici."
            />
          </View>
        ) : (
          <NotificationsFeed
            items={items}
            hasUnread={hasUnread}
            hasMore={hasMore}
            refreshing={feedQ.isRefetching && !feedQ.isFetchingNextPage}
            loadingMore={feedQ.isFetchingNextPage}
            onRefresh={() => void feedQ.refetch()}
            onPressItem={onPressItem}
            onLoadMore={loadMore}
            pageSize={NOTIFICATIONS_PAGE_SIZE}
          />
        )}
      </View>
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
  },
  centered: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyPad: {
    paddingHorizontal: spacing[4],
  },
};
}
