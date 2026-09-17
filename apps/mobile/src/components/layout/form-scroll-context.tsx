import { createContext, useCallback, useContext, useRef, type RefObject } from 'react';
import type { ScrollView, View } from 'react-native';

export type FormScrollContextValue = {
  scrollRef: RefObject<ScrollView | null>;
  scrollYRef: RefObject<number>;
};

export const FormScrollContext = createContext<FormScrollContextValue | null>(null);

export function useFormScroll(): FormScrollContextValue | null {
  return useContext(FormScrollContext);
}

export function useFormScrollProviderValue(): FormScrollContextValue {
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);
  return { scrollRef, scrollYRef };
}

/** Place le champ au sommet de la zone scrollable (au-dessus du clavier). */
export function useScrollFocusedFieldIntoView() {
  const formScroll = useFormScroll();

  return useCallback(
    (targetRef: RefObject<View | null>) => {
      const scroll = formScroll?.scrollRef.current;
      const node = targetRef.current;
      if (!scroll || !node || typeof scroll.scrollTo !== 'function') {
        return;
      }

      const run = () => {
        node.measureInWindow((_x, y) => {
          const measureScroll =
            typeof (scroll as ScrollView & { measureInWindow?: typeof node.measureInWindow })
              .measureInWindow === 'function'
              ? (scroll as ScrollView & { measureInWindow: typeof node.measureInWindow }).measureInWindow.bind(
                  scroll,
                )
              : null;
          if (!measureScroll) {
            scroll.scrollTo({
              y: Math.max(0, (formScroll?.scrollYRef.current ?? 0) + y - 160),
              animated: true,
            });
            return;
          }
          measureScroll((_sx, sy) => {
            const delta = y - sy - 12;
            scroll.scrollTo({
              y: Math.max(0, (formScroll?.scrollYRef.current ?? 0) + delta),
              animated: true,
            });
          });
        });
      };

      requestAnimationFrame(run);
      setTimeout(run, 140);
    },
    [formScroll],
  );
}
