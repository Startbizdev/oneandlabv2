import { useMemo } from 'react';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { getAppColors, syncColorblindTheme, type AppColors } from './colors';

/** Hook thème : réagit au type daltonien dans les écrans / composants UI. */
export function useAppColors(): AppColors {
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  return useMemo(() => {
    syncColorblindTheme(colorblindType);
    return getAppColors();
  }, [colorblindType]);
}
