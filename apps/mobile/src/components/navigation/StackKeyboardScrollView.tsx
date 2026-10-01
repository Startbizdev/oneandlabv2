import { useAppColors } from '@/theme/use-app-colors';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';
import type { ReactNode, RefObject } from 'react';
import { useRef } from 'react';
import { Platform, RefreshControl, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { useStyles } from '@/theme';

type Props = {
  children: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  bottomOffset?: number;
  showsVerticalScrollIndicator?: boolean;
};

/** Scroll d'écran de pile avec formulaire — suit le clavier. */
export function StackKeyboardScrollView({
  children,
  scrollRef,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  bottomOffset,
  showsVerticalScrollIndicator = false,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const innerRef = useRef<ScrollView>(null);
  const resolvedRef = scrollRef ?? innerRef;

  useScrollToTopOnPop(resolvedRef);

  return (
    <KeyboardScrollView
      ref={resolvedRef}
      style={styles.scroll}
      bottomOffset={bottomOffset}
      collapsable={false}
      nestedScrollEnabled={Platform.OS === 'android'}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        ) : undefined
      }
    >
      {children}
    </KeyboardScrollView>
  );
}

function buildStyles() {
  return {
    scroll: {
      minWidth: 0,
      flex: 1,
    },
  };
}
