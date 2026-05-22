import React, { type ReactElement, type ReactNode } from 'react';
import { FlatList, type FlatListProps, RefreshControl, StyleSheet, View } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useQueryListUi } from '@/lib/hooks/use-query-list-ui';
import { colors, spacing } from '@/theme';

type QuerySlice<T> = Pick<UseQueryResult<T>, 'isPending' | 'isFetching' | 'data' | 'refetch'>;

type Props<T, Item> = Omit<
  FlatListProps<Item>,
  'data' | 'refreshControl' | 'ListHeaderComponent'
> & {
  query: QuerySlice<T>;
  /** Données affichées (peut être dérivées / filtrées côté écran). */
  items: Item[];
  ListHeaderComponent?: React.ComponentType<unknown> | ReactElement | null;
  /** Contenu au-dessus de la liste (barre recherche, onglets…) — toujours visible. */
  header?: ReactNode;
  skeletonCount?: number;
  skeletonHeight?: number;
  skeletonGap?: number;
};

export function QueryFlatList<T, Item>({
  query,
  items,
  header,
  ListHeaderComponent,
  skeletonCount = 4,
  skeletonHeight = 116,
  skeletonGap = 12,
  contentContainerStyle,
  ...flatListProps
}: Props<T, Item>) {
  const ui = useQueryListUi(query);
  const { refreshing, onRefresh } = useManualRefresh(query.refetch);

  if (ui.showInitialPlaceholder) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.skeleton}>
          <SkeletonGroup count={skeletonCount} height={skeletonHeight} gap={skeletonGap} />
        </View>
      </View>
    );
  }

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
});
