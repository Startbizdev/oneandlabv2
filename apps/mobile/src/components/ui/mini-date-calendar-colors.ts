import type { AppColors } from '@/theme/colors';

export type MiniDateCalendarVariant = 'brand' | 'neutral';

export type MiniDateCalendarColorSet = {
  headerBg: string;
  headerText: string;
  bodyBg: string;
  dayText: string;
  footerBg: string;
  footerText: string;
  border: string;
  footerDivider: string;
};

export function getMiniDateCalendarColors(
  variant: MiniDateCalendarVariant,
  c: AppColors,
): MiniDateCalendarColorSet {
  if (variant === 'neutral') {
    return {
      headerBg: c.surfaceAlt,
      headerText: c.textSecondary,
      bodyBg: c.surface,
      dayText: c.textPrimary,
      footerBg: c.surface,
      footerText: c.textTertiary,
      border: c.borderLight,
      footerDivider: c.borderLight,
    };
  }
  return {
    headerBg: c.primary,
    headerText: c.textInverse,
    bodyBg: c.surface,
    dayText: c.textPrimary,
    footerBg: c.primaryLight,
    footerText: c.primaryDark,
    border: c.borderLight,
    footerDivider: c.primaryMid,
  };
}
