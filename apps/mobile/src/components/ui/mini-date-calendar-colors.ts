import { appleCalendarPalette } from '@/theme/calendar-palette';
import type { AppColors } from '@/theme/colors';

export type MiniDateCalendarVariant = 'brand' | 'apple';

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
  if (variant === 'apple') {
    return appleCalendarPalette;
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
