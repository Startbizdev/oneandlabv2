import type { FlashListRef } from '@shopify/flash-list';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** Distance au bas (pt) en deçà de laquelle le fil suit les nouveaux contenus. */
const NEAR_BOTTOM = 96;

/**
 * Défilement du fil Cary : suit le bas tant que l'utilisateur y est (réponse en cours, clavier),
 * s'arrête dès qu'il remonte lire, et propose alors « Revenir en bas ».
 */
export function useCaryAiChatScroll<T>(listRef: RefObject<FlashListRef<T> | null>, activeId: string) {
  const followRef = useRef(true);
  const draggingRef = useRef(false);
  const momentumRef = useRef(false);
  const listHeightRef = useRef(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollToEnd = useCallback(
    (animated = true) => {
      followRef.current = true;
      setShowScrollToBottom(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
    },
    [listRef],
  );

  useEffect(() => {
    followRef.current = true;
    setShowScrollToBottom(false);
  }, [activeId]);

  /** Revenir au bas, par n'importe quel moyen, relance le suivi ; seul un geste de l'utilisateur l'arrête. */
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nearBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height) < NEAR_BOTTOM;
    if (nearBottom) followRef.current = true;
    else if (draggingRef.current || momentumRef.current) followRef.current = false;
    const show = !followRef.current && !nearBottom;
    setShowScrollToBottom((prev) => (prev === show ? prev : show));
  }, []);

  const onScrollBeginDrag = useCallback(() => {
    draggingRef.current = true;
  }, []);
  const onScrollEndDrag = useCallback(() => {
    draggingRef.current = false;
  }, []);
  const onMomentumScrollBegin = useCallback(() => {
    momentumRef.current = true;
  }, []);
  const onMomentumScrollEnd = useCallback(() => {
    momentumRef.current = false;
  }, []);

  const onContentSizeChange = useCallback(() => {
    if (followRef.current) listRef.current?.scrollToEnd({ animated: false });
  }, [listRef]);

  /** Liste réduite (clavier, pièce jointe) : rester collé au bas si on y était. */
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      const shrunk = height < listHeightRef.current;
      listHeightRef.current = height;
      if (shrunk && followRef.current) listRef.current?.scrollToEnd({ animated: false });
    },
    [listRef],
  );

  return {
    showScrollToBottom,
    scrollToEnd,
    listScrollProps: {
      onScroll,
      onScrollBeginDrag,
      onScrollEndDrag,
      onMomentumScrollBegin,
      onMomentumScrollEnd,
      onLayout,
    },
    onContentSizeChange,
  };
}
