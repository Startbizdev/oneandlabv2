import type { TextStyle } from 'react-native';

/** Polices Raleway chargées dans `app/_layout.tsx` (titres uniquement). */
export const headingFontFamily = {
  semiBold: 'Raleway_600SemiBold',
  bold: 'Raleway_700Bold',
  extraBold: 'Raleway_800ExtraBold',
} as const;

/** Raleway dessine par défaut des chiffres elzéviriens (« 8h00 » se lit « 8hoo »). */
const HEADING_NUMERALS: TextStyle['fontVariant'] = ['lining-nums'];

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
  headingSemiBold: { fontFamily: headingFontFamily.semiBold, fontVariant: HEADING_NUMERALS },
  heading: { fontFamily: headingFontFamily.bold, fontVariant: HEADING_NUMERALS },
  headingExtraBold: { fontFamily: headingFontFamily.extraBold, fontVariant: HEADING_NUMERALS },
} as const satisfies Record<string, TextStyle>;

/**
 * Échelle de tailles (avant scale accessibilité « Texte agrandi »). Minimum lisible : 12 px.
 * Préférer les rôles `Theme.text.*` ; ces pas servent aux cas que les rôles ne couvrent pas.
 */
export const FONT_SIZE_BASE = {
  /** Pastilles et compteurs uniquement — jamais pour du contenu informatif seul. */
  '2xs': 12,
  /** caption */
  xs: 14,
  /** secondary */
  sm: 15,
  /** body */
  base: 16,
  /** headline */
  md: 18,
  lg: 20,
  xl: 22,
  /** title */
  '2xl': 26,
  /** display */
  '3xl': 34,
} as const;

export type FontSizeKey = keyof typeof FONT_SIZE_BASE;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
} as const;

type TextRole = {
  face: TextStyle;
  size: FontSizeKey;
  leading: number;
  tracking: number;
};

/**
 * Rôles éditoriaux — une seule source pour la hiérarchie :
 * - `display` : chiffre ou titre héros (rare, un par écran au plus)
 * - `title` : titre d'écran ou de sheet plein écran
 * - `headline` : titre de section, de carte ou de sheet
 * - `body` : contenu courant
 * - `secondary` : texte d'appui (description, sous-titre) — gris par défaut dans `AppText`
 * - `caption` : métadonnées (dates, aides de champ, compteurs) — gris par défaut dans `AppText`
 */
const TEXT_ROLES = {
  display: { face: font.heading, size: '3xl', leading: lineHeight.tight, tracking: -0.4 },
  title: { face: font.heading, size: '2xl', leading: lineHeight.tight, tracking: -0.3 },
  headline: { face: font.headingSemiBold, size: 'md', leading: lineHeight.snug, tracking: 0 },
  body: { face: font.regular, size: 'base', leading: lineHeight.normal, tracking: 0 },
  secondary: { face: font.regular, size: 'sm', leading: lineHeight.normal, tracking: 0 },
  caption: { face: font.regular, size: 'xs', leading: lineHeight.snug, tracking: 0 },
} as const satisfies Record<string, TextRole>;

export type TextVariant = keyof typeof TEXT_ROLES;

type ScaledFontSizes = Readonly<Record<FontSizeKey, number>>;

function roleStyle(role: TextRole, fontSize: ScaledFontSizes): TextStyle {
  const size = fontSize[role.size];
  return {
    ...role.face,
    fontSize: size,
    lineHeight: Math.round(size * role.leading),
    letterSpacing: role.tracking,
  };
}

/** Styles des rôles pour des tailles déjà mises à l'échelle (`Theme.fontSize`). */
export function buildTextStyles(fontSize: ScaledFontSizes): Readonly<Record<TextVariant, TextStyle>> {
  return {
    display: roleStyle(TEXT_ROLES.display, fontSize),
    title: roleStyle(TEXT_ROLES.title, fontSize),
    headline: roleStyle(TEXT_ROLES.headline, fontSize),
    body: roleStyle(TEXT_ROLES.body, fontSize),
    secondary: roleStyle(TEXT_ROLES.secondary, fontSize),
    caption: roleStyle(TEXT_ROLES.caption, fontSize),
  };
}

/** Line-height calculé pour une taille de police (px). */
export function lh(sizePx: number, ratio: number = lineHeight.normal): number {
  return Math.round(sizePx * ratio);
}
