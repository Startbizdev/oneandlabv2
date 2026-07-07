import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
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
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';

type ScrollPaddingOptions = {
  extraTop?: number;
  extraBottom?: number;
};

type Props = {
  children: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollPaddingOptions?: ScrollPaddingOptions;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  showsVerticalScrollIndicator?: boolean;
  /** Le chrome est rendu hors scroll avec `paddingTop` — ne pas réappliquer l'inset haut. */
  omitTopInset?: boolean;
};

/**
 * ScrollView onglet NativeTabs — copie exacte du pattern NurseAppointmentsListScreen / PatientsListScreen.
 * Parent obligatoire : `<View style={{
    minWidth: 0, flex: 1 }}>`.
 */
export function TabSceneScrollView({
  children,
  scrollRef: scrollRefProp,
  contentContainerStyle,
  scrollPaddingOptions,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.35,
  showsVerticalScrollIndicator = false,
  omitTopInset = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'TabSceneScrollView');
  const sceneInsets = useTabSceneInsets();
  const scrollInsets = omitTopInset ? { ...sceneInsets, insetTop: 0 } : sceneInsets;
  const innerRef = useRef<ScrollView>(null);
  const scrollRef = scrollRefProp ?? innerRef;

  useScrollToTopOnPop(scrollRef);

  const scrollConfig = buildTabSceneScrollConfig(
    scrollInsets,
    contentContainerStyle,
    scrollPaddingOptions,
  );

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
      {...spreadTabSceneScrollProps(scrollConfig)}
      contentContainerStyle={scrollConfig.contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
            progressViewOffset={scrollConfig.refreshProgressOffset}
          />
        ) : undefined
      }
      onScroll={onEndReached ? handleScroll : undefined}
      scrollEventThrottle={onEndReached ? 200 : undefined}
    >
      {children}
    </ScrollView>
  );
}

function buildStyles(_c: AppColors) {
  return {
    list: {
      minWidth: 0,
      flex: 1,
    },
  };
}
