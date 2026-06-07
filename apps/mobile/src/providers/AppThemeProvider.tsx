import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import {
  getAppColors,
  syncColorblindTheme,
  type AppColors,
  type ColorblindType,
} from '@/theme/colors';
import { clearThemedStyleCache } from '@/theme/themed-style-cache';

interface AppThemeContextValue {
  colors: AppColors;
  colorblindType: ColorblindType;
  colorblindMode: boolean;
  /** Clé pour remonter la navigation / forcer le refresh visuel. */
  themeKey: string;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const colorblindMode = colorblindType !== 'off';

  useEffect(() => {
    if (useAppPreferencesStore.persist.hasHydrated()) {
      syncColorblindTheme(useAppPreferencesStore.getState().colorblindType);
      return;
    }
    return useAppPreferencesStore.persist.onFinishHydration(() => {
      syncColorblindTheme(useAppPreferencesStore.getState().colorblindType);
    });
  }, []);

  useEffect(() => {
    syncColorblindTheme(colorblindType);
    clearThemedStyleCache();
  }, [colorblindType]);

  const value = useMemo(
    () => ({
      colors: getAppColors(),
      colorblindType,
      colorblindMode,
      themeKey: colorblindType,
    }),
    [colorblindType, colorblindMode],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}

/** @deprecated Préférer AppThemeProvider. */
export { AppThemeProvider as ColorblindThemeProvider };
