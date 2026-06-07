/** Type de compensation chromatique (accessibilité daltonisme). */
export type ColorblindType = 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia';

export const DEFAULT_COLORBLIND_TYPE = 'deuteranopia' as const satisfies Exclude<
  ColorblindType,
  'off'
>;

export type ActiveColorblindType = Exclude<ColorblindType, 'off'>;

export const COLORBLIND_TYPE_OPTIONS: {
  value: ActiveColorblindType;
  label: string;
  hint: string;
}[] = [
  {
    value: 'deuteranopia',
    label: 'Rouge et vert',
    hint: 'Ces deux couleurs se ressemblent — cas le plus fréquent',
  },
  {
    value: 'protanopia',
    label: 'Rouge pâle',
    hint: 'Le rouge paraît faible ou proche du vert',
  },
  {
    value: 'tritanopia',
    label: 'Bleu et jaune',
    hint: 'Ces deux couleurs se ressemblent — cas plus rare',
  },
];

export function isColorblindActive(type: ColorblindType): boolean {
  return type !== 'off';
}
