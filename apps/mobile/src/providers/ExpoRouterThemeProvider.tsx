import { ThemeProvider } from '@react-navigation/native';
import { useMemo, type ReactNode } from 'react';
import { buildExpoRouterNavigationTheme } from '@/navigation/expo-router-navigation-theme';
import { useAppColors } from '@/theme/use-app-colors';

/** Thème navigation natif (NativeTabs iOS 26) — requis pour éviter overlays / flashs système. */
export function ExpoRouterThemeProvider({ children }: { children: ReactNode }) {
  const c = useAppColors();
  const theme = useMemo(
    () => buildExpoRouterNavigationTheme(c),
    [c.border, c.primary, c.surface, c.textPrimary],
  );

  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}
