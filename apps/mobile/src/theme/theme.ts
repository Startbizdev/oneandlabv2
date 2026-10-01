import { buildAppColors, type AppColors } from './colors';
import type { ColorblindType } from './colorblind-types';
import { getTextScaleMultiplierFor, type TextScale } from './text-scale';
import { elevation, radius } from './tokens';
import { font, FONT_SIZE_BASE, type FontSizeKey } from './typography';

/** Espacements nommés (grille de 4 pt). */
export const space = {
  none: 0,
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export type Theme = {
  readonly colorblindType: ColorblindType;
  readonly textScale: TextScale;
  readonly colors: AppColors;
  /** Tailles de police déjà mises à l'échelle (réglage « Texte agrandi »). */
  readonly fontSize: Readonly<Record<FontSizeKey, number>>;
  readonly font: typeof font;
  readonly space: typeof space;
  readonly radius: typeof radius;
  readonly shadow: typeof elevation;
  /** Met à l'échelle une dimension liée au texte (hauteurs minimales, cibles tactiles). */
  readonly scale: (px: number) => number;
};

const themeCache = new Map<string, Theme>();

/** Thème clair unique — une instance stable par combinaison de réglages d'accessibilité. */
export function buildTheme(colorblindType: ColorblindType, textScale: TextScale): Theme {
  const key = `${colorblindType}:${textScale}`;
  const hit = themeCache.get(key);
  if (hit) return hit;

  const multiplier = getTextScaleMultiplierFor(textScale);
  const scale = (px: number) => Math.round(px * multiplier);
  const fontSize = Object.fromEntries(
    Object.entries(FONT_SIZE_BASE).map(([k, v]) => [k, scale(v)]),
  ) as Record<FontSizeKey, number>;

  const theme: Theme = {
    colorblindType,
    textScale,
    colors: buildAppColors(colorblindType),
    fontSize,
    font,
    space,
    radius,
    shadow: elevation,
    scale,
  };
  themeCache.set(key, theme);
  return theme;
}
