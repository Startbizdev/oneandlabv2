import React, { useCallback, useMemo } from 'react';
import { View, type ListRenderItem } from 'react-native';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import type { AppNotification } from '@/features/notifications/api/notifications.service';
import {
  buildNotificationFeedRows,
  type NotificationFeedRow,
} from '@/features/notifications/utils/notification-feed-rows';
import { NotificationCard } from './NotificationCard';
import { InfiniteQueryFlatList } from '@/components/ui/InfiniteQueryFlatList';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props<TPage> {
  query: UseInfiniteQueryResult<InfiniteData<TPage>>;
  items: AppNotification[];
  pageSize: number;
  onPressItem: (item: AppNotification) => void;
}

export function NotificationsFeed<TPage>({ query, items, pageSize, onPressItem }: Props<TPage>) {
  const styles = useStyles(buildStyles);
  const rows = useMemo(() => buildNotificationFeedRows(items), [items]);

  const renderItem: ListRenderItem<NotificationFeedRow> = useCallback(
    ({ item: row }) =>
      row.kind === 'header' ? (
        <AppText style={styles.sectionTitle} accessibilityRole="header">
          {row.title}
        </AppText>
      ) : (
        <View style={styles.cardWrap}>
          <NotificationCard item={row.item} onPress={() => onPressItem(row.item)} />
        </View>
      ),
    [onPressItem, styles],
  );

  const showEndHint = !query.hasNextPage && items.length > pageSize;

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
            Icon={Bell}
            title="Rien de nouveau"
            description="Les rappels et messages arriveront ici."
          />
        </View>
      }
      ListFooterComponent={
        showEndHint ? <AppText style={styles.endHint}>Fin de l’historique</AppText> : null
      }
    />
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    listContent: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[10],
    },
    sectionTitle: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      paddingHorizontal: spacing[1],
      paddingTop: spacing[3],
      marginBottom: spacing[2],
    },
    cardWrap: {
      marginBottom: spacing[2],
    },
    empty: {
      minWidth: 0,
      flex: 1,
      justifyContent: 'center' as const,
      paddingVertical: spacing[10],
    },
    endHint: {
      textAlign: 'center' as const,
      marginTop: spacing[2],
      ...font.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
  };
}
