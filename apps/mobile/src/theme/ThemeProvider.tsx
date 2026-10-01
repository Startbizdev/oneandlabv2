import React, { createContext, useContext, type ReactNode } from 'react';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { buildTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme>(buildTheme('off', 'normal'));

/** Fournit le thème courant (réglages daltonisme et taille de texte). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const textScale = useAppPreferencesStore((s) => s.textScale);
  return (
    <ThemeContext.Provider value={buildTheme(colorblindType, textScale)}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
