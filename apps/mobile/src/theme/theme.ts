import type { TextStyle } from 'react-native';
import { buildAppColors, type AppColors } from './colors';
import type { ColorblindType } from './colorblind-types';
import { getTextScaleMultiplierFor, type TextScale } from './text-scale';
import { elevation, radius } from './tokens';
import { buildTextStyles, font, FONT_SIZE_BASE, type FontSizeKey, type TextVariant } from './typography';

export type Theme = {
  readonly colorblindType: ColorblindType;
  readonly textScale: TextScale;
  readonly colors: AppColors;
  /** Tailles de police déjà mises à l'échelle (réglage « Texte agrandi »). */
  readonly fontSize: Readonly<Record<FontSizeKey, number>>;
  /** Rôles typographiques mis à l'échelle (`display`, `title`, `headline`, `body`, `secondary`, `caption`). */
  readonly text: Readonly<Record<TextVariant, TextStyle>>;
  readonly font: typeof font;
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
    text: buildTextStyles(fontSize),
    font,
    radius,
    shadow: elevation,
    scale,
  };
  themeCache.set(key, theme);
  return theme;
}
