import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React, { type ReactElement, type ReactNode } from 'react';
import { FlatList, type FlatListProps, RefreshControl, View } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { SkeletonList } from '@/components/ui/skeletons';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useQueryListUi } from '@/lib/hooks/use-query-list-ui';
import { spacing } from '@/theme';

type QuerySlice<T> = Pick<
  UseQueryResult<T>,
  'isPending' | 'isFetching' | 'isLoading' | 'data' | 'isError' | 'isSuccess' | 'refetch'
>;

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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'QueryFlatList');
  const ui = useQueryListUi(query);
  const { refreshing, onRefresh } = useManualRefresh(query.refetch);

  if (ui.showInitialPlaceholder) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.skeleton}>
          <SkeletonList count={skeletonCount} itemHeight={skeletonHeight} gap={skeletonGap} />
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
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
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
  };
}
