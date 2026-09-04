import { createContext, useContext, useRef, type RefObject } from 'react';
import type { ScrollView } from 'react-native';

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
