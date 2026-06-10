import type { AppColors } from '@/theme/colors';

/** Palette calendrier emoji Apple 📅 — usage décoratif hors liste RDV. */
export const MINI_DATE_CALENDAR_APPLE_COLORS = {
  accent: '#D4534B',
  headerBg: '#D4534B',
  headerText: '#FFFFFF',
  bodyBg: '#FFFFFF',
  dayText: '#000000',
  footerBg: '#FFFFFF',
  footerText: '#D4534B',
  border: '#E5E5EA',
  footerDivider: '#EBEBEB',
} as const;

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
    return MINI_DATE_CALENDAR_APPLE_COLORS;
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
