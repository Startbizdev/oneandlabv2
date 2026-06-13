import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React, { type ReactElement, type ReactNode, useCallback } from 'react';
import {
  ActivityIndicator,
  type FlatListProps,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import { SkeletonList } from '@/components/ui/skeletons';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useAppColors } from '@/theme/use-app-colors';
import { spacing } from '@/theme';

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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'InfiniteQueryFlatList');
  const { refreshing, onRefresh } = useManualRefresh(query.refetch);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  const {
    renderItem,
    keyExtractor,
    ItemSeparatorComponent,
    ListEmptyComponent,
    showsVerticalScrollIndicator,
    contentInsetAdjustmentBehavior,
  } = flatListProps;

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

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={c.primary}
      colors={[c.primary]}
    />
  );

  const listHeaderNode = ListHeaderComponent
    ? React.isValidElement(ListHeaderComponent)
      ? ListHeaderComponent
      : React.createElement(ListHeaderComponent as React.ComponentType)
    : null;

  const emptyNode =
    ListEmptyComponent == null
      ? null
      : typeof ListEmptyComponent === 'function'
        ? <ListEmptyComponent />
        : ListEmptyComponent;

  if (items.length === 0 && emptyNode) {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView
          contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          contentContainerStyle={[styles.listContent, styles.emptyScrollContent, contentContainerStyle]}
          refreshControl={refreshControl}
        >
          {listHeaderNode}
          {emptyNode}
        </ScrollView>
      </View>
    );
  }

  const footer = (
    <>
      {query.isFetchingNextPage ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : null}
      {typeof ListFooterComponent === 'function' ? <ListFooterComponent /> : ListFooterComponent}
    </>
  );

  return (
    <View style={styles.root}>
      {header}
      <FlashList
        data={items}
        renderItem={renderItem as unknown as ListRenderItem<Item>}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ItemSeparatorComponent}
        ListHeaderComponent={ListHeaderComponent}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        refreshControl={refreshControl}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListFooterComponent={footer}
      />
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    root: { minWidth: 0, flex: 1 },
    skeleton: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      flex: 1,
    },
    listContent: {
      minWidth: 0,
      flexGrow: 1,
    },
    emptyScrollContent: {
      minWidth: 0,
      flexGrow: 1,
      paddingBottom: spacing[8],
    },
    footerLoader: {
      paddingVertical: spacing[4],
      alignItems: 'center' as const,
    },
  };
}
