import type { AppColors } from '@/theme/colors';
import { fontFamily, fontSize, lh } from '@/theme/typography';

/** Échelle typo — cartes liste RDV (lisible, alignée tokens globaux). */
export function buildRdvListCardTypography(c: AppColors) {
  const body = fontSize.base;
  const meta = fontSize.sm;

  return {
    scheduleDate: {
      fontFamily: fontFamily.semiBold,
      fontSize: body,
      lineHeight: lh(body),
      color: c.textPrimary,
      letterSpacing: -0.15,
      textTransform: 'capitalize' as const,
    },
    scheduleRelative: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      color: c.primary,
    },
    slot: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm),
      color: c.textPrimary,
      letterSpacing: -0.05,
    },
    careTag: {
      fontFamily: fontFamily.medium,
      fontSize: meta,
      lineHeight: lh(meta),
      color: c.textPrimary,
    },
    careEmoji: {
      fontSize: meta,
      lineHeight: lh(meta),
    },
    meta: {
      fontFamily: fontFamily.regular,
      fontSize: meta,
      lineHeight: lh(meta),
      color: c.textSecondary,
    },
    /** @deprecated Préférer scheduleDate */
    day: {
      fontFamily: fontFamily.semiBold,
      fontSize: body,
      lineHeight: lh(body),
      color: c.textPrimary,
    },
    /** @deprecated Préférer personName */
    patientName: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.md,
      lineHeight: lh(fontSize.md),
      color: c.textPrimary,
    },
    /** @deprecated */
    care: {
      fontFamily: fontFamily.medium,
      fontSize: body,
      lineHeight: lh(body),
      color: c.textPrimary,
    },
    /** @deprecated */
    careSep: {
      fontFamily: fontFamily.medium,
      fontSize: meta,
      lineHeight: lh(meta),
      color: c.textTertiary,
    },
  } as const;
}
