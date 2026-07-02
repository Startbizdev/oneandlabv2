import type { AppColors } from '@/theme/colors';

import { useThemedStyles } from '@/theme/use-themed-styles';

import React, { type ReactElement, type ReactNode, useRef } from 'react';

import { FlatList, Platform, ScrollView, type FlatListProps, View } from 'react-native';

import { AppRefreshControl } from '@/components/ui/AppRefreshControl';

import { TabSceneScrollView } from '@/components/navigation/TabSceneScrollView';

import { TabSceneMappedListBody } from '@/components/ui/tab-scene-mapped-list-body';

import type { UseQueryResult } from '@tanstack/react-query';

import { SkeletonList } from '@/components/ui/skeletons';

import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';

import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';

import { useQueryListUi } from '@/lib/hooks/use-query-list-ui';

import {

  buildTabSceneScrollConfig,

  spreadTabSceneScrollProps,

  useTabSceneInsets,

} from '@/components/navigation/liquid-glass-header-inset';

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

  items: Item[];

  ListHeaderComponent?: React.ComponentType<unknown> | ReactElement | null;

  header?: ReactNode;

  skeletonCount?: number;

  skeletonHeight?: number;

  skeletonGap?: number;

  scrollPaddingOptions?: { extraTop?: number; extraBottom?: number };

};



export function QueryFlatList<T, Item>({

  query,

  items,

  header,

  ListHeaderComponent,

  skeletonCount = 4,

  skeletonHeight = 116,

  skeletonGap = 12,

  scrollPaddingOptions,

  contentContainerStyle,

  ...flatListProps

}: Props<T, Item>) {

  const styles = useThemedStyles(buildStyles, 'QueryFlatList');

  const sceneInsets = useTabSceneInsets();

  const flatListRef = useRef<FlatList<Item>>(null);

  const scrollRef = useRef<ScrollView>(null);

  const ui = useQueryListUi(query);

  const { refreshing, onRefresh } = useManualRefresh(query.refetch);

  useScrollToTopOnPop(Platform.OS === 'android' ? scrollRef : flatListRef);

  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, contentContainerStyle, scrollPaddingOptions);



  const { renderItem, keyExtractor, ItemSeparatorComponent, ListEmptyComponent, ListFooterComponent } =

    flatListProps;



  if (ui.showInitialPlaceholder) {

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



  if (Platform.OS === 'android') {

    return (

      <View style={styles.root} collapsable={false}>

        {header}

        <TabSceneScrollView

          scrollRef={scrollRef}

          contentContainerStyle={[styles.listContent, contentContainerStyle]}

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

        {...spreadTabSceneScrollProps(scrollConfig)}

        contentContainerStyle={[styles.listContent, scrollConfig.contentContainerStyle]}

        refreshControl={

          <AppRefreshControl

            refreshing={refreshing}

            onRefresh={onRefresh}

            progressViewOffset={scrollConfig.refreshProgressOffset}

          />

        }

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

  };

}

