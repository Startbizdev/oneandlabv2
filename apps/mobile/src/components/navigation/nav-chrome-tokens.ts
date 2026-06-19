import { Platform } from 'react-native';

/** Hauteur estimée barre d’onglets native (hors safe area bas). */
export const NATIVE_TAB_BAR_CONTENT_HEIGHT = Platform.select({ ios: 49, default: 56 }) ?? 56;

/** Marge bas de contenu scrollable au-dessus de la tab bar flottante (liquid glass). */
export const NATIVE_TAB_BAR_CONTENT_PADDING_EXTRA = 12;

/** Hauteur rangée header compacte (titre + actions). */
export const LIQUID_GLASS_HEADER_ROW_MIN_HEIGHT = 44;

/** Hauteur rangée large title (salutation). */
export const LIQUID_GLASS_LARGE_TITLE_ROW_MIN_HEIGHT = 52;

/** Bouton d’action header — diamètre iOS 26. */
export const LIQUID_GLASS_HEADER_CONTROL_SIZE = 44;

/** Style GlassView des boutons header (cloche, retour) — pas le fond pleine largeur (expo #42224). */
export const LIQUID_GLASS_CONTROL_EFFECT = 'regular' as const;

/** FAB flottant — diamètre standard. */
export const SCREEN_FAB_DIAMETER = 56;

/** SF Symbol dans un bouton header. */
export const LIQUID_GLASS_HEADER_SYMBOL_SIZE = 20;

export type LiquidGlassHeaderVisual = 'inline' | 'large';

/** Variante du matériau glass (onglets vs stack). */
export type LiquidGlassChromeVariant = 'tab' | 'stack';

/** Intensité blur expo-blur par variante. */
export const LIQUID_GLASS_BLUR_INTENSITY: Record<LiquidGlassChromeVariant, number> = {
  tab: 42,
  stack: 52,
};

/** Opacité voile blanc par-dessus le blur (0–1). */
export const LIQUID_GLASS_FROST_OPACITY: Record<LiquidGlassChromeVariant, number> = {
  tab: 0.1,
  stack: 0.14,
};

/** Reflet spéculaire haut du verre. */
export const LIQUID_GLASS_SPECULAR_TOP = 'rgba(255, 255, 255, 0.42)';

/** Reflet spéculaire milieu du verre. */
export const LIQUID_GLASS_SPECULAR_MID = 'rgba(255, 255, 255, 0.06)';
