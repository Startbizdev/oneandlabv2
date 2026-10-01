import { Platform, type ViewStyle } from 'react-native';
import { palette } from './colors';

/**
 * Espacements (grille de 4 pt). Les demi-pas `0.5`, `1.5`, `2.5`, `3.5` sont réservés aux
 * contrôles denses (pastilles, cellules de calendrier) ; le reste de l'interface reste sur la grille.
 */
export const spacing = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  16: 64,
  24: 96,
} as const;

/**
 * Rayons : `sm` pastilles et petits éléments, `md` contrôles (boutons, champs, puits d'icônes),
 * `lg` cartes, `xl` grandes cartes isolées, `2xl` sheets et modales, `full` pilules et avatars.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

function shadow(offsetY: number, opacity: number, blur: number, androidElevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.slate[900],
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
    android: { elevation: androidElevation },
    default: {},
  });
}

/**
 * Ombres très douces : une carte se détache par son trait (`cardBorder`), pas par son ombre.
 * `xs` / `sm` pour les éléments flottants légers, `md` / `lg` pour les overlays.
 */
export const elevation = {
  xs: shadow(1, 0.03, 2, 1),
  sm: shadow(2, 0.05, 8, 2),
  md: shadow(4, 0.07, 16, 4),
  lg: shadow(8, 0.09, 24, 8),
  /** Ombre au-dessus d'un bottom sheet (pas d'overlay sombre). */
  sheetTop: shadow(-6, 0.08, 20, 12),
  /** Feuille de contenu sous le header — ombre vers le haut, très légère. */
  contentSheetTop: shadow(-3, 0.05, 10, 3),
} as const;

export const animation = {
  timing: {
    instant: 80,
    fast: 150,
    base: 250,
    slow: 400,
    verySlow: 600,
  },
  spring: {
    gentle: { damping: 20, stiffness: 200, mass: 1 },
    snappy: { damping: 22, stiffness: 320, mass: 0.9 },
    bouncy: { damping: 14, stiffness: 280, mass: 0.8 },
    tab: { damping: 24, stiffness: 380, mass: 0.85 },
  },
} as const;

/**
 * Tailles d'icônes Lucide : `md` (20) dans le contenu, `lg` (24) header / navigation / FAB.
 * `2xs` / `xs` / `sm` pour les icônes accolées à un texte secondaire ; `xl`+ pour les visuels d'état.
 */
export const iconSize = {
  '2xs': 12,
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

/** Épaisseur de trait unique des icônes Lucide. */
export const ICON_STROKE_WIDTH = 1.75;

/** Cible tactile minimale (pt), avant mise à l'échelle du texte. */
export const MIN_TOUCH_TARGET = 44;

export const H_PADDING = 16;

/** Avatars `ProfileAvatar` — diamètres en px. */
export const avatarSize = {
  sm: 44,
  md: 56,
  lg: 64,
} as const;

/** Anneaux de progression (`HealthRecordProgressRing`). */
export const progressRingSize = {
  md: 56,
  lg: 72,
} as const;
