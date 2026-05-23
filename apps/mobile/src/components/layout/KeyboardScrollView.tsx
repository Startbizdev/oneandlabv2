import { forwardRef } from 'react';
import type { ScrollView, ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props extends ScrollViewProps {
  /** Espace supplémentaire sous le champ focus (footer sticky, barre d’action…). */
  bottomOffset?: number;
  enabled?: boolean;
}

/**
 * ScrollView qui remonte le champ actif au-dessus du clavier.
 * Préférer ce composant à KeyboardAvoidingView + ScrollView.
 */
export const KeyboardScrollView = forwardRef<ScrollView, Props>(function KeyboardScrollView(
  {
    bottomOffset,
    enabled = true,
    keyboardShouldPersistTaps = 'handled',
    showsVerticalScrollIndicator = false,
    contentInsetAdjustmentBehavior = 'automatic',
    ...props
  },
  ref,
) {
  const { bottom } = useSafeAreaInsets();

  return (
    <KeyboardAwareScrollView
      ref={ref}
      enabled={enabled}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      bottomOffset={bottomOffset ?? Math.max(bottom, 8)}
      {...props}
    />
  );
});
