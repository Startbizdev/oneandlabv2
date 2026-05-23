import React, { type ReactElement, type ReactNode, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type FlatListProps,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import { SkeletonList } from '@/components/ui/skeletons';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { colors, spacing } from '@/theme';

type Props<TPage, Item> = Omit<
  FlatListProps<Item>,
  'data' | 'refreshControl' | 'ListHeaderComponent' | 'onEndReached'
> & {
  query: Pick<
    UseInfiniteQueryResult<TPage>,
    'isPending' | 'isFetching' | 'isFetchingNextPage' | 'hasNextPage' | 'fetchNextPage' | 'refetch' | 'data'
  >;
  items: Item[];
  ListHeaderComponent?: React.ComponentType<unknown> | ReactElement | null;
  header?: ReactNode;
  skeletonCount?: number;
  skeletonHeight?: number;
  skeletonGap?: number;
};

export function InfiniteQueryFlatList<TPage, Item>({
  query,
  items,
  header,
  ListHeaderComponent,
  skeletonCount = 4,
  skeletonHeight = 116,
  skeletonGap = 12,
  contentContainerStyle,
  ListFooterComponent,
  ...flatListProps
}: Props<TPage, Item>) {
  const { refreshing, onRefresh } = useManualRefresh(query.refetch);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  if (query.isPending && !query.data) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.skeleton}>
          <SkeletonList count={skeletonCount} itemHeight={skeletonHeight} gap={skeletonGap} />
        </View>
      </View>
    );
  }

  const footer = (
    <>
      {query.isFetchingNextPage ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {typeof ListFooterComponent === 'function' ? <ListFooterComponent /> : ListFooterComponent}
    </>
  );

  return (
    <View style={styles.root}>
      {header}
      <FlatList
        {...flatListProps}
        data={items}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListFooterComponent={footer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skeleton: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
});
