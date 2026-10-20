import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import {
  Platform,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type ScrollViewProps,
} from 'react-native';
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
    onLayout,
    onContentSizeChange,
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

  /**
   * iOS ne ramène pas la position quand le contenu raccourcit (option retirée, champ masqué) :
   * le haut reste caché sous l'en-tête et un vide apparaît en bas. Android le fait seul.
   */
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const clampScroll = useCallback(() => {
    if (Platform.OS !== 'ios' || viewportHeightRef.current <= 0) return;
    const maxY = Math.max(0, contentHeightRef.current - viewportHeightRef.current);
    if (formScroll.scrollYRef.current <= maxY + 1) return;
    formScroll.scrollYRef.current = maxY;
    innerRef.current?.scrollTo({ y: maxY, animated: false });
  }, [formScroll.scrollYRef, innerRef]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeightRef.current = event.nativeEvent.layout.height;
      clampScroll();
      onLayout?.(event);
    },
    [clampScroll, onLayout],
  );

  const handleContentSizeChange = useCallback(
    (width: number, height: number) => {
      contentHeightRef.current = height;
      clampScroll();
      onContentSizeChange?.(width, height);
    },
    [clampScroll, onContentSizeChange],
  );

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
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        {...props}
      />
    </FormScrollContext.Provider>
  );
});
