import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { forwardRef } from 'react';
import type { ScrollView, ScrollViewProps } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardScrollView } from './KeyboardScrollView';
import { ScreenActionLayout } from './ScreenActionLayout';
import { spacing } from '@/theme';

/** Hauteur estimée barre d'action (hors safe area basse). */
export const FORM_ACTION_BAR_HEIGHT = 48 + spacing[3] + spacing[3];

interface Props extends ScrollViewProps {
  children: React.ReactNode;
  backgroundColor?: string;
  footer?: React.ReactNode;
}

/** Formulaire scrollable avec barre d'action optionnelle au-dessus du clavier. */
export const FormScreen = forwardRef<ScrollView, Props>(function FormScreen(
  {
    children,
    contentContainerStyle,
    backgroundColor,
    footer,
    style,
    ...scrollProps
  },
  ref,
) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'FormScreen');
  const bg = backgroundColor ?? c.background;
  const { bottom } = useSafeAreaInsets();
  const footerInset = Math.max(bottom, spacing[2]);
  const footerPad = footer
    ? FORM_ACTION_BAR_HEIGHT + footerInset + spacing[2]
    : 0;

  return (
    <ScreenActionLayout
      footer={
        footer ? (
          <KeyboardStickyView offset={{ closed: 0, opened: footerInset }}>
            {footer}
          </KeyboardStickyView>
        ) : undefined
      }
      style={[styles.container, { backgroundColor: bg }, style]}
    >
      <KeyboardScrollView
        ref={ref}
        style={styles.scroll}
        bottomOffset={footer ? FORM_ACTION_BAR_HEIGHT + footerInset : footerInset}
        contentContainerStyle={[
          styles.content,
          footerPad > 0 && { paddingBottom: footerPad },
          contentContainerStyle,
        ]}
        {...scrollProps}
      >
        {children}
      </KeyboardScrollView>
    </ScreenActionLayout>
  );
});

function buildStyles(c: AppColors) {
  return {
    container: {
      minWidth: 0,
      flex: 1,
      minHeight: 0,
      backgroundColor: c.background,
    },
    scroll: {
      minWidth: 0,
      flex: 1,
    },
    content: {
      minWidth: 0,
      flexGrow: 1,
    },
  };
}
