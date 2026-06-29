import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import type { ReactNode, RefObject } from 'react';
import { useRef } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';

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
  showsVerticalScrollIndicator?: boolean;
};

/**
 * ScrollView stack sous header glass — même pattern Android que TabSceneScrollView / liste RDV.
 * Parent : `StackScreenFrame` / `TabScreenShell` (`flex: 1`).
 */
export function StackScrollView({
  children,
  scrollRef: scrollRefProp,
  contentContainerStyle,
  scrollPaddingOptions,
  refreshing = false,
  onRefresh,
  showsVerticalScrollIndicator = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'StackScrollView');
  const innerRef = useRef<ScrollView>(null);
  const scrollRef = scrollRefProp ?? innerRef;
  const scrollConfig = useStackScrollConfig(contentContainerStyle, scrollPaddingOptions);

  useScrollToTopOnPop(scrollRef);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
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
    >
      {children}
    </ScrollView>
  );
}

function buildStyles(_c: AppColors) {
  return {
    scroll: {
      minWidth: 0,
      flex: 1,
    },
  };
}
