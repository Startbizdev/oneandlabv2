import { createContext, useContext } from 'react';

const SheetKeyboardContext = createContext(false);

/** Actif dans le contenu d’une sheet native : sélecteurs et pickers s’ouvrent en ligne. */
export function SheetKeyboardProvider({ children }: { children: React.ReactNode }) {
  return <SheetKeyboardContext.Provider value={true}>{children}</SheetKeyboardContext.Provider>;
}

export function useInBottomSheet(): boolean {
  return useContext(SheetKeyboardContext);
}
