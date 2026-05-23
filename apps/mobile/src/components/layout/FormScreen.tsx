import { StyleSheet } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardScrollView } from './KeyboardScrollView';
import { ScreenActionLayout } from './ScreenActionLayout';
import { colors, spacing } from '@/theme';

/** Hauteur estimée barre d'action (hors safe area basse). */
export const FORM_ACTION_BAR_HEIGHT = 48 + spacing[3] + spacing[3];

interface Props extends ScrollViewProps {
  children: React.ReactNode;
  backgroundColor?: string;
  footer?: React.ReactNode;
}

/** Formulaire scrollable avec barre d'action optionnelle au-dessus du clavier. */
export function FormScreen({
  children,
  contentContainerStyle,
  backgroundColor = colors.background,
  footer,
  style,
  ...scrollProps
}: Props) {
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
      style={[styles.container, { backgroundColor }, style]}
    >
      <KeyboardScrollView
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
