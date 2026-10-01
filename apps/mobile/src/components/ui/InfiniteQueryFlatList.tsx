

import React, { type ReactElement, type ReactNode, useCallback, useRef } from 'react';

import {

  ActivityIndicator,

  Platform,

  ScrollView,

  type FlatListProps,

  View,

} from 'react-native';

import { FlashList, type FlashListRef } from '@shopify/flash-list';

import type { UseInfiniteQueryResult } from '@tanstack/react-query';

import { SkeletonList } from '@/components/ui/skeletons';

import { Button } from '@/components/ui/Button';

import { ErrorState } from '@/components/ui/ErrorState';

import { AppRefreshControl } from '@/components/ui/AppRefreshControl';

import { TabSceneScrollView } from '@/components/navigation/TabSceneScrollView';

import { TabSceneMappedListBody } from '@/components/ui/tab-scene-mapped-list-body';

import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';

import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';

import { useAppColors } from '@/theme/use-app-colors';

import { spacing, useStyles } from '@/theme';



/** FlashList (iOS) et le corps mappé Android ne partagent que `item` et `index`. */
export type InfiniteListRenderItem<Item> = (info: { item: Item; index: number }) => ReactElement | null;

type Props<TPage, Item> = Omit<

  FlatListProps<Item>,

  'data' | 'refreshControl' | 'ListHeaderComponent' | 'onEndReached' | 'renderItem'

> & {

  renderItem: InfiniteListRenderItem<Item>;

  query: Pick<

    UseInfiniteQueryResult<TPage>,

    | 'isPending'
    | 'isFetching'
    | 'isFetchingNextPage'
    | 'isFetchNextPageError'
    | 'isError'
    | 'error'
    | 'hasNextPage'
    | 'fetchNextPage'
    | 'refetch'
    | 'data'

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

  renderItem,

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

  const styles = useStyles(buildStyles);

  const flashListRef = useRef<FlashListRef<Item>>(null);

  const scrollRef = useRef<ScrollView>(null);

  const { refreshing, onRefresh } = useManualRefresh(query.refetch);

  useScrollToTopOnPop(Platform.OS === 'android' ? scrollRef : flashListRef);



  const loadMore = useCallback(() => {

    if (query.hasNextPage && !query.isFetchingNextPage && !query.isFetchNextPageError) {

      void query.fetchNextPage();

    }

  }, [query]);



  const {

    keyExtractor,

    ItemSeparatorComponent,

    ListEmptyComponent,

    showsVerticalScrollIndicator,

  } = flatListProps;



  const contentStyle = [styles.listContent, contentContainerStyle];


  if (query.isPending && !query.data) {

    return (

      <View style={styles.root} collapsable={false}>

        {header}

        <View style={styles.skeleton}>
          <SkeletonList count={skeletonCount} itemHeight={skeletonHeight} gap={skeletonGap} />

        </View>

      </View>

    );

  }

  if (query.isError && !query.data) {
    return (
      <View style={styles.root} collapsable={false}>
        {header}
        <View style={styles.errorWrap}>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </View>
      </View>
    );
  }



  const footer = (

    <>

      {query.isFetchingNextPage ? (

        <View style={styles.footerLoader}>

          <ActivityIndicator color={c.primary} />

        </View>

      ) : query.isFetchNextPageError ? (
        <View style={styles.footerLoader}>
          <Button
            title="Impossible de charger la suite · Réessayer"
            variant="ghost"
            size="sm"
            onPress={() => void query.fetchNextPage()}
          />
        </View>
      ) : null}

      {typeof ListFooterComponent === 'function' ? <ListFooterComponent /> : ListFooterComponent}

    </>

  );



  if (Platform.OS === 'android') {

    return (

      <View style={styles.root} collapsable={false}>

        {header}

        <TabSceneScrollView

          scrollRef={scrollRef}

          contentContainerStyle={contentStyle}

          refreshing={refreshing}

          onRefresh={onRefresh}

          onEndReached={loadMore}

          showsVerticalScrollIndicator={showsVerticalScrollIndicator}

        >

          <TabSceneMappedListBody

            items={items}

            renderItem={renderItem}

            keyExtractor={keyExtractor}

            ItemSeparatorComponent={ItemSeparatorComponent}

            ListHeaderComponent={ListHeaderComponent}

            ListEmptyComponent={ListEmptyComponent}

            ListFooterComponent={footer}

          />

        </TabSceneScrollView>

      </View>

    );

  }



  const refreshControl = <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />;



  return (

    <View style={styles.root} collapsable={false}>

      {header}

      <FlashList

        ref={flashListRef}

        style={styles.list}

        data={items}

        renderItem={renderItem}

        keyExtractor={keyExtractor}

        ItemSeparatorComponent={ItemSeparatorComponent}

        ListHeaderComponent={ListHeaderComponent}

        ListEmptyComponent={ListEmptyComponent}

        contentInsetAdjustmentBehavior="automatic"

        showsVerticalScrollIndicator={showsVerticalScrollIndicator}

        contentContainerStyle={contentStyle}

        refreshControl={refreshControl}

        onEndReached={loadMore}

        onEndReachedThreshold={0.35}

        ListFooterComponent={footer}

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

    listContent: {

      minWidth: 0,

      flexGrow: 1,

    },

    errorWrap: {
      minWidth: 0,
      flex: 1,
      justifyContent: 'center' as const,
    },

    footerLoader: {

      paddingVertical: spacing[4],

      alignItems: 'center' as const,

    },

  };

}

