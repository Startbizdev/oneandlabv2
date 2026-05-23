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
import { resolveNotificationNavigation } from '../utils/notification-navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, spacing } from '@/theme';

const FEED_QUERY_KEY = queryKeys.notifications.feed(NOTIFICATIONS_PAGE_SIZE);

export function NotificationsScreen() {
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
    onSuccess: invalidateFeed,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await markAllNotificationsRead();
      if (res.success) return res.data?.marked ?? 0;
      const unread = items.filter((n) => !n.read_at);
      if (unread.length === 0) return 0;
      await Promise.all(unread.map((n) => markNotificationRead(n.id)));
      return unread.length;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: FEED_QUERY_KEY });
      const prev = qc.getQueryData(FEED_QUERY_KEY);
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
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(FEED_QUERY_KEY, ctx.prev);
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
            <ActivityIndicator color={colors.primary} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPad: {
    paddingHorizontal: spacing[4],
  },
});
