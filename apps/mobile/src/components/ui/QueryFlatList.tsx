

import React, { type ReactElement, type ReactNode, useRef } from 'react';

import { FlatList, Platform, ScrollView, StyleSheet, type FlatListProps, type ViewStyle, View } from 'react-native';

import { AppRefreshControl } from '@/components/ui/AppRefreshControl';

import { TabSceneScrollView } from '@/components/navigation/TabSceneScrollView';

import { TabSceneMappedListBody } from '@/components/ui/tab-scene-mapped-list-body';

import type { UseQueryResult } from '@tanstack/react-query';

import { SkeletonList } from '@/components/ui/skeletons';

import { ErrorState } from '@/components/ui/ErrorState';

import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';

import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';

import { useQueryListUi } from '@/lib/hooks/use-query-list-ui';

import { spacing, useStyles } from '@/theme';



type QuerySlice<T> = Pick<

  UseQueryResult<T>,

  'isPending' | 'isFetching' | 'isLoading' | 'data' | 'isError' | 'error' | 'isSuccess' | 'refetch'

>;



type Props<T, Item> = Omit<

  FlatListProps<Item>,

  'data' | 'refreshControl' | 'ListHeaderComponent'

> & {

  query: QuerySlice<T>;

  items: Item[];

  ListHeaderComponent?: React.ComponentType<unknown> | ReactElement | null;

  header?: ReactNode;

  skeletonCount?: number;

  skeletonHeight?: number;

  skeletonGap?: number;

  /** Espace ajouté sous le dernier élément (ex. bouton flottant). */
  extraBottom?: number;

};



export function QueryFlatList<T, Item>({

  query,

  items,

  header,

  ListHeaderComponent,

  skeletonCount = 4,

  skeletonHeight = 116,

  skeletonGap = 12,

  extraBottom = 0,

  contentContainerStyle,

  ...flatListProps

}: Props<T, Item>) {

  const styles = useStyles(buildStyles);

  const flatListRef = useRef<FlatList<Item>>(null);

  const scrollRef = useRef<ScrollView>(null);

  const ui = useQueryListUi(query);

  const { refreshing, onRefresh } = useManualRefresh(query.refetch);

  useScrollToTopOnPop(Platform.OS === 'android' ? scrollRef : flatListRef);

  const flatContent: ViewStyle = StyleSheet.flatten([styles.listContent, contentContainerStyle]);
  const basePaddingBottom = typeof flatContent.paddingBottom === 'number' ? flatContent.paddingBottom : 0;
  const contentStyle =
    extraBottom > 0 ? { ...flatContent, paddingBottom: basePaddingBottom + extraBottom } : flatContent;



  const { renderItem, keyExtractor, ItemSeparatorComponent, ListEmptyComponent, ListFooterComponent } =

    flatListProps;



  if (ui.showInitialPlaceholder) {

    return (

      <View style={styles.root} collapsable={false}>

        {header}

        <View style={styles.skeleton}>
          <SkeletonList count={skeletonCount} itemHeight={skeletonHeight} gap={skeletonGap} />

        </View>

      </View>

    );

  }

  if (query.isError && !ui.hasCachedData) {
    return (
      <View style={styles.root} collapsable={false}>
        {header}
        <View style={styles.errorWrap}>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </View>
      </View>
    );
  }



  if (Platform.OS === 'android') {

    return (

      <View style={styles.root} collapsable={false}>

        {header}

        <TabSceneScrollView

          scrollRef={scrollRef}

          contentContainerStyle={contentStyle}

          refreshing={refreshing}

          onRefresh={onRefresh}

          showsVerticalScrollIndicator={flatListProps.showsVerticalScrollIndicator}

        >

          <TabSceneMappedListBody

            items={items}

            renderItem={renderItem}

            keyExtractor={keyExtractor}

            ItemSeparatorComponent={ItemSeparatorComponent}

            ListHeaderComponent={ListHeaderComponent}

            ListEmptyComponent={ListEmptyComponent}

            ListFooterComponent={ListFooterComponent}

          />

        </TabSceneScrollView>

      </View>

    );

  }



  return (

    <View style={styles.root} collapsable={false}>

      {header}

      <FlatList

        ref={flatListRef}

        style={styles.list}

        {...flatListProps}

        data={items}

        ListHeaderComponent={ListHeaderComponent}

        contentInsetAdjustmentBehavior="automatic"

        contentContainerStyle={contentStyle}

        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}

      />

    </View>

  );

}



function buildStyles() {

  return {

    root: { minWidth: 0, flex: 1 },

    list: { minWidth: 0, flex: 1 },

    skeleton: {

      minWidth: 0,

      paddingHorizontal: spacing[4],

      paddingTop: spacing[2],

      flex: 1,

    },

    errorWrap: {
      minWidth: 0,
      flex: 1,
      justifyContent: 'center' as const,
    },

    listContent: {

      minWidth: 0,

      flexGrow: 1,

    },

  };

}

