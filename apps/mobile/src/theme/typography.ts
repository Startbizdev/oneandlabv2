import { scaleFontSize } from './text-scale';

export const fontFamily = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

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

export function getFontSize(key: FontSizeKey): number {
  return scaleFontSize(FONT_SIZE_BASE[key]);
}

/** Échelle typographique courante (respecte le réglage « Texte agrandi »). */
export const fontSize = new Proxy(FONT_SIZE_BASE, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string' && prop in FONT_SIZE_BASE) {
      return getFontSize(prop as FontSizeKey);
    }
    return undefined;
  },
}) as { readonly [K in FontSizeKey]: number };

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
    fontFamily: fontFamily.extraBold,
    fontSize: FONT_SIZE_BASE['4xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: FONT_SIZE_BASE['4xl'] * lineHeight.tight,
  },
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: FONT_SIZE_BASE['3xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: FONT_SIZE_BASE['3xl'] * lineHeight.tight,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: FONT_SIZE_BASE['2xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: FONT_SIZE_BASE['2xl'] * lineHeight.snug,
  },
  h3: {
    fontFamily: fontFamily.semiBold,
    fontSize: FONT_SIZE_BASE.xl,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.xl * lineHeight.snug,
  },
  h4: {
    fontFamily: fontFamily.semiBold,
    fontSize: FONT_SIZE_BASE.lg,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.lg * lineHeight.snug,
  },
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: FONT_SIZE_BASE.md,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.md * lineHeight.normal,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: FONT_SIZE_BASE.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.base * lineHeight.normal,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: FONT_SIZE_BASE.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.base * lineHeight.normal,
  },
  bodySemiBold: {
    fontFamily: fontFamily.semiBold,
    fontSize: FONT_SIZE_BASE.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.base * lineHeight.normal,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: FONT_SIZE_BASE.xs,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.xs * lineHeight.snug,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: FONT_SIZE_BASE.sm,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.sm * lineHeight.snug,
  },
  overline: {
    fontFamily: fontFamily.semiBold,
    fontSize: FONT_SIZE_BASE.xs,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.xs * lineHeight.normal,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: FONT_SIZE_BASE.sm,
    letterSpacing: letterSpacing.normal,
    lineHeight: FONT_SIZE_BASE.sm * lineHeight.snug,
  },
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: FONT_SIZE_BASE.base,
    letterSpacing: letterSpacing.normal,
  },
  buttonSm: {
    fontFamily: fontFamily.semiBold,
    fontSize: FONT_SIZE_BASE.sm,
    letterSpacing: letterSpacing.normal,
  },
  buttonLg: {
    fontFamily: fontFamily.bold,
    fontSize: FONT_SIZE_BASE.md,
    letterSpacing: letterSpacing.normal,
  },
} as const;

export type TextVariant = keyof typeof textStyles;

/** Styles typographiques scalés (réglage « Texte agrandi »). */
export function getTextStyle(variant: TextVariant) {
  const base = textStyles[variant];
  const scaledSize = scaleFontSize(base.fontSize);
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
