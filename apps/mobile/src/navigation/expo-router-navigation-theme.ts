import { DefaultTheme, type Theme } from '@react-navigation/native';
import type { AppColors } from '@/theme/colors';

/** Thème React Navigation / expo-router aligné sur les tokens Cary (iOS 26 NativeTabs). */
export function buildExpoRouterNavigationTheme(c: AppColors): Theme {
  return {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: c.primary,
      background: c.surface,
      card: c.surface,
      text: c.textPrimary,
      border: c.border,
      notification: c.primary,
    },
  };
}
