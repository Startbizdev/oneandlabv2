import { getColorblindSemantic } from './colorblind-palette';
import {
  DEFAULT_COLORBLIND_TYPE,
  type ActiveColorblindType,
  type ColorblindType,
} from './colorblind-types';

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
  },
  cyan: {
    400: brand.gradientStart,
    500: '#22C9BE',
    600: brand.gradientEnd,
  },
  canvas: {
    base: '#F4FAFA',
    light: '#F8FCFC',
    muted: '#EEF6F5',
  },
  warm: {
    50: '#F7F4EF',
    100: '#F3F0EA',
    150: '#EBE6DE',
    200: '#E2DCD2',
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

declare global {
  // eslint-disable-next-line no-var
  var __CARY_COLORBLIND_TYPE__: ColorblindType | undefined;
}

export function syncColorblindTheme(type: ColorblindType): void {
  globalThis.__CARY_COLORBLIND_TYPE__ = type;
}

/** @deprecated Préférer syncColorblindTheme(type). */
export function syncColorblindGlobal(enabled: boolean): void {
  syncColorblindTheme(enabled ? DEFAULT_COLORBLIND_TYPE : 'off');
}

export function getColorblindType(): ColorblindType {
  return globalThis.__CARY_COLORBLIND_TYPE__ ?? 'off';
}

export function isColorblindModeEnabled(): boolean {
  return getColorblindType() !== 'off';
}

function resolveSemantic(type: ColorblindType) {
  if (type === 'off') return null;
  return getColorblindSemantic(type);
}

function buildAppColorsSync(type: ColorblindType) {
  const cb = resolveSemantic(type);

  return {
    /** Fond principal — blanc pur (onglets, stacks, listes). */
    background: palette.white,
    surface: palette.white,
    surfaceAlt: palette.canvas.muted,
    surfaceSubtle: palette.brand[50],
    bookingCanvas: palette.canvas.base,
    bookingCanvasLight: palette.canvas.light,

    gradientStart: cb?.gradientStart ?? brand.gradientStart,
    gradientEnd: cb?.gradientEnd ?? brand.gradientEnd,

    border: palette.slate[200],
    /** Séparateurs internes (hairlines). */
    borderLight: palette.slate[100],
    /** Contour carte sur fond blanc. */
    cardBorder: palette.slate[200],
    borderFocus: cb?.borderFocus ?? brand.primary,
    borderError: cb?.error ?? palette.red[500],

    textPrimary: palette.slate[900],
    textSecondary: palette.slate[600],
    textTertiary: palette.slate[500],
    textInverse: palette.white,
    textLink: cb?.textLink ?? brand.primary,

    primary: cb?.primary ?? brand.primary,
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

    statusPending: cb?.statusPending ?? {
      bg: palette.amber[50],
      text: palette.amber[700],
      dot: palette.amber[500],
    },
    statusAccepted: cb?.statusAccepted ?? {
      bg: palette.brand[50],
      text: palette.brand[800],
      dot: brand.primary,
    },
    statusCompleted: cb?.statusCompleted ?? {
      bg: palette.green[50],
      text: palette.green[700],
      dot: palette.green[500],
    },
    statusCancelled: cb?.statusCancelled ?? {
      bg: palette.red[50],
      text: palette.red[700],
      dot: palette.red[500],
    },
    statusNeutral: cb?.statusNeutral ?? {
      bg: palette.slate[100],
      text: palette.slate[600],
      dot: palette.slate[400],
    },

    star: cb?.star ?? palette.amber[600],
    starFill: cb?.starFill ?? palette.amber[100],
  };
}

export type AppColors = ReturnType<typeof buildAppColorsSync>;

/** Palette courante (recalculée à chaque accès — type daltonien pris en compte). */
export function getAppColors(): AppColors {
  return buildAppColorsSync(getColorblindType());
}

/**
 * Compat : accès dynamique aux tokens via Proxy.
 * @deprecated Dans les composants React, préférer `useAppColors()` pour réagir au mode daltonien.
 * OK pour config statique (navigation) et StyleSheet module-level en cours de migration.
 */
export const colors: AppColors = new Proxy({} as AppColors, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getAppColors()[prop as keyof AppColors];
    }
    return undefined;
  },
});

export type ColorKey = keyof AppColors;
