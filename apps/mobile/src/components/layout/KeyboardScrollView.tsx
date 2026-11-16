import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Keyboard, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormScrollContext, useFormScrollProviderValue } from './form-scroll-context';

/** Air entre le champ actif et le clavier (la barre « Valider » iOS est déjà comptée dans la hauteur du clavier). */
const KEYBOARD_CLEARANCE = 48;

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
    children,
    ...props
  },
  ref,
) {
  const { bottom } = useSafeAreaInsets();
  const formScroll = useFormScrollProviderValue<ScrollView>();
  const innerRef = formScroll.scrollRef;

  useImperativeHandle(ref, () => innerRef.current as ScrollView);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      formScroll.scrollYRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [formScroll.scrollYRef, onScroll],
  );

  // Clavier ouvert : espace de sa hauteur en bas de page, pour pouvoir remonter un champ placé en fin
  // de page jusqu'en haut de l'écran (sinon le défilement bute sur la fin du contenu).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const resolvedBottomOffset = (bottomOffset ?? Math.max(bottom, 8)) + KEYBOARD_CLEARANCE;

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
        extraKeyboardSpace={KEYBOARD_CLEARANCE}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        {...props}
      >
        {children}
        {keyboardHeight > 0 ? <View style={{ height: keyboardHeight }} pointerEvents="none" /> : null}
      </KeyboardAwareScrollView>
    </FormScrollContext.Provider>
  );
});
