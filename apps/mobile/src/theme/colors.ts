import { getColorblindSemantic } from './colorblind-palette';
import { contrastForeground } from './color-utils';
import type { ActiveColorblindType, ColorblindType } from './colorblind-types';

export type { ColorblindType, ActiveColorblindType } from './colorblind-types';
export { COLORBLIND_TYPE_OPTIONS, DEFAULT_COLORBLIND_TYPE } from './colorblind-types';

/** Tokens marque Cary — palette de base (indépendante du mode daltonien). */
export const brand = {
  primary: '#1CC7B5',
  gradientStart: '#2FD4C2',
  gradientEnd: '#16B6D6',
  primaryRgb: 'rgb(28, 199, 181)',
} as const;

export const palette = {
  brand: {
    50: '#E8FBF9',
    100: '#D1F7F3',
    200: '#A8EFE8',
    300: '#6FE5DB',
    400: '#3DD9CC',
    500: brand.primary,
    600: '#18B5A5',
    700: '#149E90',
    800: '#108578',
    900: '#0C6B61',
    950: '#064A44',
  },
  cyan: {
    400: brand.gradientStart,
    500: '#22C9BE',
    600: brand.gradientEnd,
  },
  /** Neutres chauds : fond d'app, puits d'icônes, traits. */
  sand: {
    100: '#F7F6F3',
    200: '#EFEDE8',
    300: '#ECE9E3',
    400: '#E4E0D9',
    500: '#D6D1C8',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    150: '#ECF0F6',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
  },
  teal: {
    600: '#0D9488',
  },
  neutral: {
    300: '#CCCCCC',
    900: '#1A1A1A',
    950: '#111111',
  },
  /** Couleurs de marques tierces (icônes d'intégration) — ne pas utiliser pour l'UI Cary. */
  thirdParty: {
    appleHealth: '#FF2D55',
    healthConnect: '#1B7F5E',
    waze: '#33CCFF',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

function resolveSemantic(type: ColorblindType) {
  if (type === 'off') return null;
  return getColorblindSemantic(type);
}

export function buildAppColors(type: ColorblindType) {
  const cb = resolveSemantic(type);

  return {
    /** Fond d'app unique (écrans, stacks, listes) — neutre légèrement chaud. */
    background: palette.sand[100],
    /** Cartes, sheets, barres. */
    surface: palette.white,
    /** Surface neutre en retrait : puits d'icônes, pistes de segments, squelettes, boutons `muted`. */
    surfaceAlt: palette.sand[200],

    gradientStart: cb?.gradientStart ?? brand.gradientStart,
    gradientEnd: cb?.gradientEnd ?? brand.gradientEnd,

    /** Contour des contrôles (champs, boutons `outline`). */
    border: palette.sand[500],
    /** Séparateurs internes (hairlines). */
    borderLight: palette.sand[300],
    /** Contour carte sur le fond d'app. */
    cardBorder: palette.sand[400],
    borderFocus: cb?.borderFocus ?? brand.primary,
    borderError: cb?.error ?? palette.red[500],

    textPrimary: palette.slate[900],
    textSecondary: palette.slate[600],
    textTertiary: palette.slate[500],
    textInverse: palette.white,
    textLink: cb?.textLink ?? palette.brand[900],

    primary: cb?.primary ?? brand.primary,
    onPrimary: contrastForeground(cb?.primary ?? brand.primary, palette.slate[900], palette.white),
    primaryLight: cb?.primaryLight ?? palette.brand[50],
    primaryMid: cb?.primaryMid ?? palette.brand[100],
    primaryDark: cb?.primaryDark ?? palette.brand[700],

    success: cb?.success ?? palette.green[600],
    successLight: cb?.successLight ?? palette.green[50],
    successMid: cb?.successMid ?? palette.green[100],
    successSurface: cb?.successSurface ?? palette.green[200],

    warning: cb?.warning ?? palette.amber[600],
    warningLight: cb?.warningLight ?? palette.amber[50],
    warningMid: cb?.warningMid ?? palette.amber[100],

    error: cb?.error ?? palette.red[600],
    errorLight: cb?.errorLight ?? palette.red[50],
    errorMid: cb?.errorMid ?? palette.red[100],

    star: cb?.star ?? palette.amber[600],
    starFill: cb?.starFill ?? palette.amber[500],
  };
}

export type AppColors = ReturnType<typeof buildAppColors>;

export type ColorKey = keyof AppColors;
