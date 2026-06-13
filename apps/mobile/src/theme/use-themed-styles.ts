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
type LooseStyleRecord = Record<string, object>;
/** Sortie StyleSheet — chaque entrée est un ViewStyle (compatible View ; Text accepte le sous-ensemble). */
export type ThemedStyles<T extends LooseStyleRecord> = {
  readonly [K in keyof T]: ViewStyle;
};

/**
 * buildStyles / getThemedStyles factories MUST return plain style objects.
 * Never `return StyleSheet.create(...)` — useThemedStyles applies StyleSheet.create once.
 */
export function assertPlainThemedStyleFactoryResult(
  styles: LooseStyleRecord,
  context: string,
): void {
  if (!__DEV__) return;

  for (const [name, style] of Object.entries(styles)) {
    if (typeof style === 'number') {
      throw new Error(
        `[themed-styles] ${context}: style "${name}" is a StyleSheet ID (number). ` +
          'Remove StyleSheet.create from buildStyles — return a plain object instead.',
      );
    }
    if (style != null && typeof style !== 'object') {
      throw new Error(
        `[themed-styles] ${context}: style "${name}" must be a plain object, got ${typeof style}.`,
      );
    }
  }
}

function createThemedStyles<T extends LooseStyleRecord>(
  factory: (c: AppColors) => T,
  context: string,
): T {
  const raw = factory(getAppColors());
  assertPlainThemedStyleFactoryResult(raw, context);
  return StyleSheet.create(raw as StyleSheet.NamedStyles<T>) as T;
}

/** Styles recalculés quand le mode accessibilité change (composants fonctionnels). */
export function useThemedStyles<T extends LooseStyleRecord>(
  factory: (c: AppColors) => T,
  context = 'useThemedStyles',
): T {
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const textScale = useAppPreferencesStore((s) => s.textScale);
  return useMemo(
    () => createThemedStyles(factory, context),
    [colorblindType, textScale, factory, context],
  );
}

/**
 * Styles thématiques partagés — appeler à chaque rendu (pas au chargement du module).
 * `id` doit être unique par factory.
 */
export function getThemedStyles<T extends LooseStyleRecord>(
  id: string,
  factory: (c: AppColors) => T,
): T {
  const themeKey = getThemeCacheKey();
  const hit = getThemedStyleCacheEntry(id);
  if (hit && hit.themeKey === themeKey) {
    return hit.styles as T;
  }
  const styles = createThemedStyles(factory, id);
  setThemedStyleCacheEntry(id, { themeKey, styles: styles as NamedStyles });
  return styles;
}
