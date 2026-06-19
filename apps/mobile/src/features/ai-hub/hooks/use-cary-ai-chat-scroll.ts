import type { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useRef, type RefObject } from 'react';

type ScrollDeps = {
  messageCount: number;
  streamingTextLength: number;
  awaitingReply: boolean;
  activeId: string | null;
};

/**
 * Scroll bas chronologique (liste non inversée) — pattern chat 2025+ avec footer sticky.
 */
export function useCaryAiChatScroll<T>(
  listRef: RefObject<FlashList<T> | null>,
  { messageCount, streamingTextLength, awaitingReply, activeId }: ScrollDeps,
) {
  const lastStreamLenRef = useRef(0);
  const lastStreamTimeRef = useRef(0);
  const scrollScheduledRef = useRef(false);

  const scrollToEnd = useCallback(
    (animated = true) => {
      if (scrollScheduledRef.current) return;
      scrollScheduledRef.current = true;
      requestAnimationFrame(() => {
        scrollScheduledRef.current = false;
        listRef.current?.scrollToEnd({ animated });
      });
    },
    [listRef],
  );

  useEffect(() => {
    scrollToEnd(messageCount > 1);
  }, [messageCount, awaitingReply, activeId, scrollToEnd]);

  useEffect(() => {
    if (!awaitingReply) {
      lastStreamLenRef.current = 0;
      return;
    }
    const now = Date.now();
    const len = streamingTextLength;
    const delta = len - lastStreamLenRef.current;
    if (len === 0 || delta > 64 || now - lastStreamTimeRef.current > 120) {
      lastStreamLenRef.current = len;
      lastStreamTimeRef.current = now;
      scrollToEnd(false);
    }
  }, [streamingTextLength, awaitingReply, scrollToEnd]);

  /** Pas de scroll auto ici — évite la boucle layout ↔ scroll ↔ onContentSizeChange. */
  const onContentSizeChange = useCallback(() => {}, []);

  return { scrollToEnd, onContentSizeChange };
}
