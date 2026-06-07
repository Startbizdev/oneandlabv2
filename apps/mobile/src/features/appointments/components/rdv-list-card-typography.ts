import type { AppColors } from '@/theme/colors';
import { fontFamily, fontSize, lh } from '@/theme/typography';

/** Échelle typo — cartes liste RDV (lisible, alignée tokens globaux). */
export function buildRdvListCardTypography(c: AppColors) {
  const body = fontSize.base;
  const emphasis = fontSize.md;
  const meta = fontSize.sm;

  return {
    day: {
      fontFamily: fontFamily.semiBold,
      fontSize: body,
      lineHeight: lh(body),
      color: c.textPrimary,
      letterSpacing: 0.1,
    },
    patientName: {
      fontFamily: fontFamily.semiBold,
      fontSize: emphasis,
      lineHeight: lh(emphasis),
      color: c.textPrimary,
    },
    slot: {
      fontFamily: fontFamily.semiBold,
      fontSize: body,
      lineHeight: lh(body),
      color: c.primaryDark,
    },
    care: {
      fontFamily: fontFamily.medium,
      fontSize: body,
      lineHeight: lh(body),
      color: c.textPrimary,
    },
    careTag: {
      fontFamily: fontFamily.medium,
      fontSize: body,
      lineHeight: lh(body),
      color: c.textPrimary,
    },
    careEmoji: {
      fontSize: body,
      lineHeight: lh(body),
    },
    careSep: {
      fontFamily: fontFamily.medium,
      fontSize: meta,
      lineHeight: lh(meta),
      color: c.textTertiary,
    },
    meta: {
      fontFamily: fontFamily.regular,
      fontSize: meta,
      lineHeight: lh(meta),
      color: c.textSecondary,
    },
  } as const;
}
