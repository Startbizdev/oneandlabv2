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

export function getTextScaleMultiplierFor(scale: TextScale): number {
  return MULTIPLIERS[scale];
}
