export type TextScale = 'normal' | 'large';

export const TEXT_SCALE_OPTIONS: { value: TextScale; label: string; description?: string }[] = [
  { value: 'normal', label: 'Standard' },
  { value: 'large', label: 'Agrandi', description: 'Textes plus grands dans toute l’app' },
];

const MULTIPLIERS: Record<TextScale, number> = {
  normal: 1,
  large: 1.125,
};

export function getTextScaleMultiplierFor(scale: TextScale): number {
  return MULTIPLIERS[scale];
}
