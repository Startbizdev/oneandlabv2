import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import type { AppNotification } from '@/features/notifications/api/notifications.service';
import { NotificationCard } from './NotificationCard';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  items: AppNotification[];
  hasUnread: boolean;
  hasMore: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  onRefresh: () => void;
  onPressItem: (item: AppNotification) => void;
  onLoadMore: () => void;
  pageSize: number;
}

export function NotificationsFeed({
  items,
  hasUnread,
  hasMore,
  refreshing,
  loadingMore,
  onRefresh,
  onPressItem,
  onLoadMore,
  pageSize,
}: Props) {
  const renderItem: ListRenderItem<AppNotification> = useCallback(
    ({ item }) => <NotificationCard item={item} onPress={() => onPressItem(item)} />,
    [onPressItem],
  );

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  const ListHeader = useCallback(
    () => (
      <Text style={styles.sectionTitle}>
        {hasUnread ? 'Non lues en premier' : 'Toutes lues'}
      </Text>
    ),
    [hasUnread],
  );

  const ListFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (hasMore) {
      return (
        <View style={styles.footerActions}>
          <Button title="Voir plus" variant="outline" size="sm" onPress={onLoadMore} fullWidth />
        </View>
      );
    }
    if (items.length > pageSize) {
      return <Text style={styles.endHint}>Fin de l'historique</Text>;
    }
    return null;
  }, [hasMore, items.length, loadingMore, onLoadMore, pageSize]);

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      onEndReached={hasMore && !loadingMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.4}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[10],
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[1],
    marginBottom: spacing[2],
  },
  separator: {
    height: spacing[2],
  },
  footerActions: {
    marginTop: spacing[2],
  },
  footerLoader: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  endHint: {
    textAlign: 'center',
    marginTop: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
