import type { AppColors } from './colors';
import { useTheme } from './ThemeProvider';

/** Couleurs du thème courant (réagit au réglage daltonisme). */
export function useAppColors(): AppColors {
  return useTheme().colors;
}
