import { createContext, useCallback, useContext, useRef, type RefObject } from 'react';
import type { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** Contrat du ScrollView de formulaire (écran ou sheet native, via `KeyboardScrollView`). */
export type FormScrollable = {
  scrollTo(options: { x?: number; y?: number; animated?: boolean }): void;
  measureInWindow?: View['measureInWindow'];
};

export type FormScrollContextValue<T extends FormScrollable = FormScrollable> = {
  scrollRef: RefObject<T | null>;
  scrollYRef: RefObject<number>;
};

export const FormScrollContext = createContext<FormScrollContextValue | null>(null);

export function useFormScroll(): FormScrollContextValue | null {
  return useContext(FormScrollContext);
}

export function useFormScrollProviderValue<T extends FormScrollable>(): FormScrollContextValue<T> {
  const scrollRef = useRef<T | null>(null);
  const scrollYRef = useRef(0);
  return { scrollRef, scrollYRef };
}

/** Place le champ au sommet de la zone scrollable (au-dessus du clavier). */
export function useScrollFocusedFieldIntoView() {
  const formScroll = useFormScroll();
  const reducedMotion = useReducedMotion();

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
            typeof scroll.measureInWindow === 'function' ? scroll.measureInWindow.bind(scroll) : null;
          if (!measureScroll) {
            scroll.scrollTo({
              y: Math.max(0, (formScroll?.scrollYRef.current ?? 0) + y - 160),
              animated: !reducedMotion,
            });
            return;
          }
          measureScroll((_sx, sy) => {
            const delta = y - sy - 12;
            scroll.scrollTo({
              y: Math.max(0, (formScroll?.scrollYRef.current ?? 0) + delta),
              animated: !reducedMotion,
            });
          });
        });
      };

      requestAnimationFrame(run);
      setTimeout(run, 140);
    },
    [formScroll, reducedMotion],
  );
}
