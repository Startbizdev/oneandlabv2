import { DefaultTheme, type Theme } from '@react-navigation/native';
import type { AppColors } from '@/theme/colors';

/** Thème React Navigation / expo-router aligné sur les tokens Cary. */
export function buildExpoRouterNavigationTheme(c: AppColors): Theme {
  return {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.textPrimary,
      border: c.border,
      notification: c.primary,
    },
  };
}
