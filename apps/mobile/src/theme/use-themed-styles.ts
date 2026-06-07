import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { getAppColors, type AppColors } from './colors';
import {
  getThemedStyleCacheEntry,
  getThemeCacheKey,
  setThemedStyleCacheEntry,
} from './themed-style-cache';

export { clearThemedStyleCache } from './themed-style-cache';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/** Styles recalculés quand le mode accessibilité change (composants fonctionnels). */
export function useThemedStyles<T extends NamedStyles>(factory: (c: AppColors) => T): T {
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const textScale = useAppPreferencesStore((s) => s.textScale);
  return useMemo(
    () => StyleSheet.create(factory(getAppColors()) as NamedStyles) as T,
    [colorblindType, textScale, factory],
  );
}

/**
 * Styles thématiques partagés — appeler à chaque rendu (pas au chargement du module).
 * `id` doit être unique par factory.
 */
export function getThemedStyles<T extends NamedStyles>(id: string, factory: (c: AppColors) => T): T {
  const themeKey = getThemeCacheKey();
  const hit = getThemedStyleCacheEntry(id);
  if (hit && hit.themeKey === themeKey) {
    return hit.styles as T;
  }
  const styles = StyleSheet.create(factory(getAppColors()) as NamedStyles) as T;
  setThemedStyleCacheEntry(id, { themeKey, styles });
  return styles;
}
