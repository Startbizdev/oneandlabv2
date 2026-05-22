/** Tokens marque Cary */
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

export const colors = {
  // Backgrounds
  background: palette.white,
  surface: palette.white,
  surfaceAlt: palette.slate[50],
  surfaceSubtle: palette.slate[100],

  // Brand gradient (CSS: linear-gradient(90deg, #2FD4C2, #16B6D6))
  gradientStart: brand.gradientStart,
  gradientEnd: brand.gradientEnd,

  // Borders
  border: palette.slate[200],
  borderLight: palette.slate[100],
  borderFocus: brand.primary,
  borderError: palette.red[500],

  // Text
  textPrimary: palette.slate[900],
  textSecondary: palette.slate[500],
  textTertiary: palette.slate[400],
  textInverse: palette.white,
  textLink: brand.primary,

  // Brand
  primary: brand.primary,
  primaryLight: palette.brand[50],
  primaryMid: palette.brand[100],
  primaryDark: palette.brand[700],

  // Semantic
  success: palette.green[600],
  successLight: palette.green[50],
  successMid: palette.green[100],

  warning: palette.amber[600],
  warningLight: palette.amber[50],
  warningMid: palette.amber[100],

  error: palette.red[600],
  errorLight: palette.red[50],
  errorMid: palette.red[100],

  // Status badge colors
  statusPending: { bg: palette.amber[50], text: palette.amber[700], dot: palette.amber[500] },
  statusAccepted: { bg: palette.brand[50], text: palette.brand[800], dot: brand.primary },
  statusCompleted: { bg: palette.green[50], text: palette.green[700], dot: palette.green[500] },
  statusCancelled: { bg: palette.red[50], text: palette.red[700], dot: palette.red[500] },
  statusNeutral: { bg: palette.slate[100], text: palette.slate[600], dot: palette.slate[400] },
} as const;

export type ColorKey = keyof typeof colors;
