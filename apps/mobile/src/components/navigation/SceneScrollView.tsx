import type { ReactNode, RefObject } from 'react';
import { useRef } from 'react';
import { Platform, RefreshControl, type ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';
import { useStyles } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

type Props = {
  children: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  showsVerticalScrollIndicator?: boolean;
};

/**
 * Scroll vertical du corps d'un écran (onglet ou pile), sous le header. Parent : `flex: 1`.
 * Remonte le champ en cours de saisie au-dessus du clavier (sinon le texte tapé est caché).
 */
export function SceneScrollView({
  children,
  scrollRef: scrollRefProp,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  showsVerticalScrollIndicator = false,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const innerRef = useRef<ScrollView>(null);
  const scrollRef = scrollRefProp ?? innerRef;

  useScrollToTopOnPop(scrollRef);

  return (
    <KeyboardScrollView
      ref={scrollRef}
      style={styles.scroll}
      collapsable={false}
      contentInsetAdjustmentBehavior="never"
      keyboardDismissMode="none"
      keyboardShouldPersistTaps="handled"
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
