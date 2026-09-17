import { forwardRef, useCallback, useImperativeHandle } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView, ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHEET_KEYBOARD_ACCESSORY_HEIGHT } from '@/components/ui/sheet-keyboard-accessory';
import { FormScrollContext, useFormScrollProviderValue } from './form-scroll-context';

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
    keyboardDismissMode = 'interactive',
    showsVerticalScrollIndicator = false,
    contentInsetAdjustmentBehavior = 'automatic',
    onScroll,
    ...props
  },
  ref,
) {
  const { bottom } = useSafeAreaInsets();
  const formScroll = useFormScrollProviderValue();
  const innerRef = formScroll.scrollRef;

  useImperativeHandle(ref, () => innerRef.current as ScrollView);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      formScroll.scrollYRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [formScroll.scrollYRef, onScroll],
  );

  const resolvedBottomOffset =
    (bottomOffset ?? Math.max(bottom, 8)) + SHEET_KEYBOARD_ACCESSORY_HEIGHT;

  return (
    <FormScrollContext.Provider value={formScroll}>
      <KeyboardAwareScrollView
        ref={innerRef}
        enabled={enabled}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
        bottomOffset={resolvedBottomOffset}
        extraKeyboardSpace={SHEET_KEYBOARD_ACCESSORY_HEIGHT}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        {...props}
      />
    </FormScrollContext.Provider>
  );
});
