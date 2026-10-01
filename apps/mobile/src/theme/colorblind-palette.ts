import type { ActiveColorblindType } from './colorblind-types';

/** Tokens sémantiques remplacés en mode accessibilité daltonisme. */
export type ColorblindSemantic = {
  success: string;
  successLight: string;
  successMid: string;
  successSurface: string;

  warning: string;
  warningLight: string;
  warningMid: string;

  error: string;
  errorLight: string;
  errorMid: string;

  primary: string;
  primaryLight: string;
  primaryMid: string;
  primaryDark: string;
  textLink: string;
  borderFocus: string;
  gradientStart: string;
  gradientEnd: string;

  star: string;
  starFill: string;
};

/**
 * Palettes validées pour le mode Couleurs accessibles.
 * success ≠ primary dans chaque variante pour préserver la sémantique.
 */
const PALETTES: Record<ActiveColorblindType, ColorblindSemantic> = {
  deuteranopia: {
    primary: '#2563EB',
    primaryLight: '#EFF6FF',
    primaryMid: '#DBEAFE',
    primaryDark: '#1D4ED8',
    textLink: '#2563EB',
    borderFocus: '#2563EB',
    gradientStart: '#3B82F6',
    gradientEnd: '#2563EB',

    success: '#0891B2',
    successLight: '#ECFEFF',
    successMid: '#CFFAFE',
    successSurface: '#A5F3FC',

    warning: '#9333EA',
    warningLight: '#FAF5FF',
    warningMid: '#F3E8FF',

    error: '#EA580C',
    errorLight: '#FFF7ED',
    errorMid: '#FFEDD5',

    star: '#D97706',
    starFill: '#FCD34D',
  },

  protanopia: {
    primary: '#1D4ED8',
    primaryLight: '#EFF6FF',
    primaryMid: '#BFDBFE',
    primaryDark: '#1E3A8A',
    textLink: '#1D4ED8',
    borderFocus: '#1D4ED8',
    gradientStart: '#2563EB',
    gradientEnd: '#1D4ED8',

    success: '#0F766E',
    successLight: '#F0FDFA',
    successMid: '#CCFBF1',
    successSurface: '#99F6E4',

    warning: '#7C3AED',
    warningLight: '#F5F3FF',
    warningMid: '#EDE9FE',

    error: '#C2410C',
    errorLight: '#FFF7ED',
    errorMid: '#FFEDD5',

    star: '#B45309',
    starFill: '#FDE68A',
  },

  tritanopia: {
    primary: '#059669',
    primaryLight: '#ECFDF5',
    primaryMid: '#D1FAE5',
    primaryDark: '#047857',
    textLink: '#047857',
    borderFocus: '#059669',
    gradientStart: '#10B981',
    gradientEnd: '#059669',

    success: '#7C3AED',
    successLight: '#F5F3FF',
    successMid: '#EDE9FE',
    successSurface: '#DDD6FE',

    warning: '#D97706',
    warningLight: '#FFFBEB',
    warningMid: '#FEF3C7',

    error: '#DC2626',
    errorLight: '#FEF2F2',
    errorMid: '#FEE2E2',

    star: '#B45309',
    starFill: '#FDE68A',
  },
};

export function getColorblindSemantic(type: ActiveColorblindType): ColorblindSemantic {
  return PALETTES[type];
}

