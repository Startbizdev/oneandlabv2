import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import type { Theme } from './theme';
import { useTheme } from './ThemeProvider';

type StyleRecord = Record<string, ViewStyle | TextStyle | ImageStyle>;
type StyleFactory<T extends StyleRecord> = (t: Theme) => T;

const styleCache = new WeakMap<StyleFactory<StyleRecord>, WeakMap<Theme, StyleRecord>>();

/** Résout une factory de styles pour un thème donné (un seul `StyleSheet.create` par couple factory / thème). */
export function resolveStyles<T extends StyleRecord>(factory: StyleFactory<T>, theme: Theme): T {
  let byTheme = styleCache.get(factory);
  if (!byTheme) {
    byTheme = new WeakMap();
    styleCache.set(factory, byTheme);
  }
  const hit = byTheme.get(theme);
  if (hit) return hit as T;
  const styles = StyleSheet.create(factory(theme));
  byTheme.set(theme, styles);
  return styles;
}

/** Styles du composant pour le thème courant. La factory doit être définie hors du composant. */
export function useStyles<T extends StyleRecord>(factory: StyleFactory<T>): T {
  return resolveStyles(factory, useTheme());
}

/** `const useScreenStyles = makeStyles((t) => ({ ... }))` puis `const styles = useScreenStyles()`. */
export function makeStyles<T extends StyleRecord>(factory: StyleFactory<T>): () => T {
  return () => useStyles(factory);
}
