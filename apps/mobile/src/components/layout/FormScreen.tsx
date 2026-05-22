import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenActionLayout } from './ScreenActionLayout';
import { colors, spacing } from '@/theme';

/** Hauteur estimée barre d'action (hors safe area basse). */
export const FORM_ACTION_BAR_HEIGHT = 48 + spacing[3] + spacing[3];

interface Props extends ScrollViewProps {
  children: React.ReactNode;
  backgroundColor?: string;
  footer?: React.ReactNode;
}

/** Formulaire scrollable avec barre d'action optionnelle en bas. */
export function FormScreen({
  children,
  contentContainerStyle,
  backgroundColor = colors.background,
  footer,
  style,
  ...scrollProps
}: Props) {
  const { bottom } = useSafeAreaInsets();
  const footerPad = footer
    ? FORM_ACTION_BAR_HEIGHT + Math.max(bottom, spacing[2]) + spacing[2]
    : 0;

  return (
    <ScreenActionLayout footer={footer} style={[styles.container, { backgroundColor }, style]}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            footerPad > 0 && { paddingBottom: footerPad },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenActionLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
