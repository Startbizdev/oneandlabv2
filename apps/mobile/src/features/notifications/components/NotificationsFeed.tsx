import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { AppNotification } from '@/features/notifications/api/notifications.service';
import {
  buildNotificationFeedRows,
  type NotificationFeedRow,
} from '@/features/notifications/utils/notification-feed-rows';
import { NotificationCard } from './NotificationCard';
import { InfiniteQueryFlatList, type InfiniteListRenderItem } from '@/components/ui/InfiniteQueryFlatList';
import { EmptyState } from '@/components/ui/EmptyState';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { spacing, AppText, useStyles, type Theme } from '@/theme';

interface Props<TPage> {
  query: UseInfiniteQueryResult<InfiniteData<TPage>>;
  items: AppNotification[];
  onPressItem: (item: AppNotification) => void;
}

export function NotificationsFeed<TPage>({ query, items, onPressItem }: Props<TPage>) {
  const styles = useStyles(buildStyles);
  const rows = useMemo(() => buildNotificationFeedRows(items), [items]);

  const renderItem: InfiniteListRenderItem<NotificationFeedRow> = useCallback(
    ({ item: row }) =>
      row.kind === 'header' ? (
        <AppText style={styles.sectionTitle} accessibilityRole="header">
          {row.title}
        </AppText>
      ) : (
        <NotificationCard
          item={row.item}
          first={row.first}
          last={row.last}
          onPress={() => onPressItem(row.item)}
        />
      ),
    [onPressItem, styles],
  );

  return (
    <InfiniteQueryFlatList
      query={query}
      items={rows}
      renderItem={renderItem}
      keyExtractor={(row) => row.key}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      skeletonHeight={76}
      ListEmptyComponent={
        <View style={styles.empty}>
          <EmptyState
            illustration="notifications"
            title="Rien de nouveau"
            description="Les rappels et messages arriveront ici."
          />
        </View>
      }
    />
  );
}

function buildStyles(theme: Theme) {
  return {
    listContent: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[10],
    },
    sectionTitle: {
      ...buildSettingsStyles(theme).sectionTitle,
      paddingTop: spacing[4],
      paddingBottom: spacing[2],
    },
    empty: {
      minWidth: 0,
      flex: 1,
      justifyContent: 'center' as const,
      paddingVertical: spacing[10],
    },
  };
}
