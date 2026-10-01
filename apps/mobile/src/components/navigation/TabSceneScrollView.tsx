import { useAppColors } from '@/theme/use-app-colors';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useRef } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useStyles } from '@/theme';

type Props = {
  children: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  showsVerticalScrollIndicator?: boolean;
};

/**
 * ScrollView des primitives `QueryFlatList` / `InfiniteQueryFlatList` sur Android.
 * Les écrans utilisent `SceneScrollView`. Parent obligatoire : `<View style={{ minWidth: 0, flex: 1 }}>`.
 */
export function TabSceneScrollView({
  children,
  scrollRef: scrollRefProp,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.35,
  showsVerticalScrollIndicator = false,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const innerRef = useRef<ScrollView>(null);
  const scrollRef = scrollRefProp ?? innerRef;

  useScrollToTopOnPop(scrollRef);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!onEndReached) return;
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const pad = Math.max(96, contentSize.height * onEndReachedThreshold * 0.15);
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - pad) {
        onEndReached();
      }
    },
    [onEndReached, onEndReachedThreshold],
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.list}
      collapsable={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={Platform.OS === 'android'}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        ) : undefined
      }
      onScroll={onEndReached ? handleScroll : undefined}
      scrollEventThrottle={onEndReached ? 200 : undefined}
    >
      {children}
    </ScrollView>
  );
}

function buildStyles() {
  return {
    list: {
      minWidth: 0,
      flex: 1,
    },
  };
}
