import { ThemeProvider } from '@react-navigation/native';
import { useMemo, type ReactNode } from 'react';
import { buildExpoRouterNavigationTheme } from '@/navigation/expo-router-navigation-theme';
import { useAppColors } from '@/theme/use-app-colors';

/** Thème React Navigation — fond des scènes aligné sur Cary pour éviter les flashs système. */
export function ExpoRouterThemeProvider({ children }: { children: ReactNode }) {
  const c = useAppColors();
  const theme = useMemo(() => buildExpoRouterNavigationTheme(c), [c]);

  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}
