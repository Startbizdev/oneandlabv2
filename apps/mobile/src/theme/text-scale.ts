export type TextScale = 'normal' | 'large';

export const TEXT_SCALE_OPTIONS: { value: TextScale; label: string; description: string }[] = [
  {
    value: 'normal',
    label: 'Standard',
    description: 'Taille de texte confortable pour la majorité des écrans',
  },
  {
    value: 'large',
    label: 'Agrandi',
    description: 'Textes et libellés plus grands — recommandé si vous avez des difficultés de lecture',
  },
];

const MULTIPLIERS: Record<TextScale, number> = {
  normal: 1,
  large: 1.125,
};

declare global {
  // eslint-disable-next-line no-var
  var __CARY_TEXT_SCALE__: TextScale | undefined;
}

export function syncTextScale(scale: TextScale): void {
  globalThis.__CARY_TEXT_SCALE__ = scale;
}

export function getTextScale(): TextScale {
  return globalThis.__CARY_TEXT_SCALE__ ?? 'normal';
}

syncTextScale('normal');

export function getTextScaleMultiplier(): number {
  return MULTIPLIERS[getTextScale()];
}

export function scaleFontSize(basePx: number): number {
  return Math.round(basePx * getTextScaleMultiplier());
}

/** Scale layout (minHeight, hit targets) avec le réglage « Texte agrandi ». */
export function scaleLayoutSize(basePx: number): number {
  return scaleFontSize(basePx);
}
