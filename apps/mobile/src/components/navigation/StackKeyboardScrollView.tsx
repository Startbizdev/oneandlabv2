import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import type { ReactNode, RefObject } from 'react';
import { useRef } from 'react';
import { Platform, RefreshControl, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
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
  bottomOffset?: number;
  showsVerticalScrollIndicator?: boolean;
};

/** Stack + clavier — pattern Android aligné StackScrollView. */
export function StackKeyboardScrollView({
  children,
  scrollRef,
  contentContainerStyle,
  scrollPaddingOptions,
  refreshing = false,
  onRefresh,
  bottomOffset,
  showsVerticalScrollIndicator = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'StackKeyboardScrollView');
  const innerRef = useRef<ScrollView>(null);
  const resolvedRef = scrollRef ?? innerRef;
  const scrollConfig = useStackScrollConfig(contentContainerStyle, scrollPaddingOptions);

  useScrollToTopOnPop(resolvedRef);

  return (
    <KeyboardScrollView
      ref={resolvedRef}
      style={styles.scroll}
      bottomOffset={bottomOffset}
      collapsable={false}
      nestedScrollEnabled={Platform.OS === 'android'}
      contentContainerStyle={scrollConfig.contentContainerStyle}
      {...spreadTabSceneScrollProps(scrollConfig)}
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
    </KeyboardScrollView>
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
