import type { AppColors } from '@/theme/colors';

import { useThemedStyles } from '@/theme/use-themed-styles';

import React, { type ReactElement, type ReactNode, useCallback, useRef } from 'react';

import {

  ActivityIndicator,

  Platform,

  ScrollView,

  type FlatListProps,

  View,

} from 'react-native';

import { FlashList, type ListRenderItem } from '@shopify/flash-list';

import type { UseInfiniteQueryResult } from '@tanstack/react-query';

import { SkeletonList } from '@/components/ui/skeletons';

import { AppRefreshControl } from '@/components/ui/AppRefreshControl';

import { TabSceneScrollView } from '@/components/navigation/TabSceneScrollView';

import { TabSceneMappedListBody } from '@/components/ui/tab-scene-mapped-list-body';

import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';

import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';

import {

  buildTabSceneScrollConfig,

  spreadTabSceneScrollProps,

  useTabSceneInsets,

} from '@/components/navigation/liquid-glass-header-inset';

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

  /** Le `header` inclut déjà `paddingTop` (inset header glass) — ne pas le réappliquer sur la liste. */
  reserveTopInsetInHeader?: boolean;

  skeletonCount?: number;

  skeletonHeight?: number;

  skeletonGap?: number;

};



export function InfiniteQueryFlatList<TPage, Item>({

  query,

  items,

  header,

  reserveTopInsetInHeader = false,

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

  const sceneInsets = useTabSceneInsets();

  const flashListRef = useRef<FlashList<Item>>(null);

  const scrollRef = useRef<ScrollView>(null);

  const { refreshing, onRefresh } = useManualRefresh(query.refetch);

  useScrollToTopOnPop(Platform.OS === 'android' ? scrollRef : flashListRef);



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

  } = flatListProps;



  const scrollInsets = reserveTopInsetInHeader && header != null
    ? { ...sceneInsets, insetTop: 0 }
    : sceneInsets;

  const scrollConfig = buildTabSceneScrollConfig(scrollInsets, contentContainerStyle);



  if (query.isPending && !query.data) {

    return (

      <View style={styles.root} collapsable={false}>

        {header}

        <View

          style={[

            styles.skeleton,

            sceneInsets.insetTop > 0 && { paddingTop: sceneInsets.insetTop },

            sceneInsets.insetBottom > 0 && { paddingBottom: sceneInsets.insetBottom },

          ]}

        >

          <SkeletonList count={skeletonCount} itemHeight={skeletonHeight} gap={skeletonGap} />

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

          contentContainerStyle={[styles.listContent, contentContainerStyle]}

          omitTopInset={reserveTopInsetInHeader && header != null}

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



  const refreshControl = (

    <AppRefreshControl

      refreshing={refreshing}

      onRefresh={onRefresh}

      progressViewOffset={scrollConfig.refreshProgressOffset}

    />

  );



  return (

    <View style={styles.root} collapsable={false}>

      {header}

      <FlashList

        ref={flashListRef}

        style={styles.list}

        data={items}

        renderItem={renderItem as unknown as ListRenderItem<Item>}

        keyExtractor={keyExtractor}

        ItemSeparatorComponent={ItemSeparatorComponent}

        ListHeaderComponent={ListHeaderComponent}

        ListEmptyComponent={ListEmptyComponent}

        {...spreadTabSceneScrollProps(scrollConfig)}

        showsVerticalScrollIndicator={showsVerticalScrollIndicator}

        contentContainerStyle={[styles.listContent, scrollConfig.contentContainerStyle]}

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

    footerLoader: {

      paddingVertical: spacing[4],

      alignItems: 'center' as const,

    },

  };

}

