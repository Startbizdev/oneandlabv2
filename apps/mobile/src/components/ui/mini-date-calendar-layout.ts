import { Platform } from 'react-native';
import { radius } from '@/theme';
import { FONT_SIZE_BASE, fontFamily, lh, lineHeight } from '@/theme/typography';

export type MiniDateCalendarSize = 'xs' | 'sm' | 'md';

/** Poids relatifs des 3 bandes (jour / chiffre / mois) dans le carré. */
const BAND_WEIGHTS = {
  header: 22,
  body: 36,
  footer: 22,
} as const;

const BORDER_WIDTH = 1;

type BandTypography = {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing: number;
  fontWeight?: '600' | '700';
};

export type MiniDateCalendarLayout = {
  outerSize: number;
  borderWidth: number;
  borderRadius: number;
  bandWeights: typeof BAND_WEIGHTS;
  /** Compense le métrique typo — équilibre visuel haut / bas du chiffre. */
  dayOffsetTop: number;
  weekday: BandTypography;
  day: BandTypography;
  month: BandTypography;
};

function bandTypography(
  fontSize: number,
  family: string,
  ratio: number,
  letterSpacing: number,
  fontWeight?: BandTypography['fontWeight'],
): BandTypography {
  return {
    fontSize,
    lineHeight: ratio === 1 ? fontSize : lh(fontSize, ratio),
    fontFamily: family,
    letterSpacing,
    fontWeight,
  };
}

const DAY_FONT_FAMILY =
  Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: fontFamily.bold,
  }) ?? fontFamily.bold;

/** Dérive tailles et typo depuis le thème — pas de px magiques dans le composant. */
function buildLayout(
  outerSize: number,
  weekdaySize: number,
  daySize: number,
  monthSize: number,
  borderRadius: number = radius.md,
  dayOffsetTop: number = 2,
): MiniDateCalendarLayout {
  return {
    outerSize,
    borderWidth: BORDER_WIDTH,
    borderRadius,
    bandWeights: BAND_WEIGHTS,
    dayOffsetTop,
    weekday: bandTypography(weekdaySize, fontFamily.bold, lineHeight.snug, 0.45),
    day: bandTypography(daySize, DAY_FONT_FAMILY, 1, 0, '700'),
    month: bandTypography(monthSize, fontFamily.semiBold, lineHeight.snug, 0.3),
  };
}

const LAYOUT_BY_SIZE: Record<MiniDateCalendarSize, MiniDateCalendarLayout> = {
  /** Liste RDV — carré compact, ne pas agrandir avec la colonne. */
  xs: buildLayout(64, FONT_SIZE_BASE['2xs'], FONT_SIZE_BASE.lg, FONT_SIZE_BASE['2xs'], radius.sm, 2),
  sm: buildLayout(76, FONT_SIZE_BASE['2xs'], FONT_SIZE_BASE.lg, FONT_SIZE_BASE['2xs'], radius.md, 2),
  md: buildLayout(88, FONT_SIZE_BASE.xs, FONT_SIZE_BASE.xl, FONT_SIZE_BASE.xs, radius.md, 3),
};

export function getMiniDateCalendarLayout(
  size: MiniDateCalendarSize = 'sm',
): MiniDateCalendarLayout {
  return LAYOUT_BY_SIZE[size];
}

export function miniDateCalendarOuterSize(size: MiniDateCalendarSize = 'sm'): number {
  return getMiniDateCalendarLayout(size).outerSize;
}
