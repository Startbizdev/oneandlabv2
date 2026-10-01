import type { TextStyle } from 'react-native';

/** Polices Raleway chargées dans `app/_layout.tsx` (titres uniquement). */
export const headingFontFamily = {
  semiBold: 'Raleway_600SemiBold',
  bold: 'Raleway_700Bold',
  extraBold: 'Raleway_800ExtraBold',
} as const;

/**
 * Rôles typographiques : police système pour le texte (graisse seule),
 * Raleway pour les titres (pas de `fontWeight` : la graisse est portée par la fonte,
 * sinon Android retombe sur la police système).
 */
export const font = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semiBold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  extraBold: { fontWeight: '800' },
  black: { fontWeight: '900' },
  headingSemiBold: { fontFamily: headingFontFamily.semiBold },
  heading: { fontFamily: headingFontFamily.bold },
  headingExtraBold: { fontFamily: headingFontFamily.extraBold },
} as const satisfies Record<string, TextStyle>;

export type FontRole = keyof typeof font;

/** Tailles de base (avant scale accessibilité « Texte agrandi »). Minimum lisible : 12 px. */
export const FONT_SIZE_BASE = {
  /** Badges décoratifs uniquement — jamais pour du contenu informatif seul */
  '2xs': 12,
  xs: 14,
  sm: 15,
  base: 16,
  md: 18,
  lg: 20,
  xl: 22,
  '2xl': 26,
  '3xl': 30,
  '4xl': 34,
  '5xl': 42,
} as const;

export type FontSizeKey = keyof typeof FONT_SIZE_BASE;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.55,
  loose: 2,
} as const;

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.25,
  wider: 0.5,
  widest: 1,
  /** @deprecated Préférer sentence case pour les titres de section */
  caps: 0.4,
} as const;

export const textStyles = {
  display: {
    ...font.headingExtraBold,
    fontSize: FONT_SIZE_BASE['4xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: FONT_SIZE_BASE['4xl'] * lineHeight.tight,
  },
  h1: {
    ...font.heading,
    fontSize: FONT_SIZE_BASE['3xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: FONT_SIZE_BASE['3xl'] * lineHeight.tight,
  },
  h2: {
    ...font.heading,
    fontSize: FONT_SIZE_BASE['2xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: FONT_SIZE_BASE['2xl'] * lineHeight.snug,
  },
  h3: {
    ...font.headingSemiBold,
    fontSize: FONT_SIZE_BASE.xl,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.xl * lineHeight.snug,
  },
  h4: {
    ...font.headingSemiBold,
    fontSize: FONT_SIZE_BASE.lg,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.lg * lineHeight.snug,
  },
  bodyLarge: {
    ...font.regular,
    fontSize: FONT_SIZE_BASE.md,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.md * lineHeight.normal,
  },
  body: {
    ...font.regular,
    fontSize: FONT_SIZE_BASE.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.base * lineHeight.normal,
  },
  bodyMedium: {
    ...font.medium,
    fontSize: FONT_SIZE_BASE.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.base * lineHeight.normal,
  },
  bodySemiBold: {
    ...font.semiBold,
    fontSize: FONT_SIZE_BASE.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.base * lineHeight.normal,
  },
  caption: {
    ...font.medium,
    fontSize: FONT_SIZE_BASE.xs,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.xs * lineHeight.snug,
  },
  sectionTitle: {
    ...font.semiBold,
    fontSize: FONT_SIZE_BASE.sm,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.sm * lineHeight.snug,
  },
  overline: {
    ...font.semiBold,
    fontSize: FONT_SIZE_BASE.xs,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.xs * lineHeight.normal,
  },
  label: {
    ...font.semiBold,
    fontSize: FONT_SIZE_BASE.sm,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.sm * lineHeight.snug,
  },
  button: {
    ...font.semiBold,
    fontSize: FONT_SIZE_BASE.base,
    letterSpacing: letterSpacing.normal,
  },
  buttonSm: {
    ...font.semiBold,
    fontSize: FONT_SIZE_BASE.sm,
    letterSpacing: letterSpacing.normal,
  },
  buttonLg: {
    ...font.bold,
    fontSize: FONT_SIZE_BASE.md,
    letterSpacing: letterSpacing.normal,
  },
} as const;

export type TextVariant = keyof typeof textStyles;

/** Styles typographiques scalés (`scale` = `Theme.scale`, réglage « Texte agrandi »). */
export function getTextStyle(variant: TextVariant, scale: (px: number) => number) {
  const base = textStyles[variant];
  const scaledSize = scale(base.fontSize);
  const baseLineHeight =
    'lineHeight' in base && typeof base.lineHeight === 'number'
      ? base.lineHeight
      : Math.round(base.fontSize * lineHeight.normal);
  const ratio = baseLineHeight / base.fontSize;
  return {
    ...base,
    fontSize: scaledSize,
    lineHeight: Math.round(scaledSize * ratio),
  };
}

/** Line-height calculé pour une taille de police (px). */
export function lh(sizePx: number, ratio: number = lineHeight.normal): number {
  return Math.round(sizePx * ratio);
}
