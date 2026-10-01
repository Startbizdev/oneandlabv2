import type { AppColors } from '@/theme/colors';
import { fontSize, lh } from '@/theme/typography';
import { font } from '@/theme';

/** Échelle typo — cartes liste RDV (lisible, alignée tokens globaux). */
export function buildRdvListCardTypography(c: AppColors) {
  const body = fontSize.base;
  const meta = fontSize.sm;

  return {
    scheduleDate: {
      ...font.semiBold,
      fontSize: body,
      lineHeight: lh(body),
      color: c.textPrimary,
      letterSpacing: -0.15,
      textTransform: 'capitalize' as const,
    },
    scheduleRelative: {
      ...font.medium,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      color: c.primary,
    },
    slot: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm),
      color: c.textPrimary,
      letterSpacing: -0.05,
    },
    careTag: {
      ...font.medium,
      fontSize: meta,
      lineHeight: lh(meta),
      color: c.textPrimary,
    },
    careEmoji: {
      fontSize: meta,
      lineHeight: lh(meta),
    },
    meta: {
      ...font.regular,
      fontSize: meta,
      lineHeight: lh(meta),
      color: c.textSecondary,
    },
    /** @deprecated Préférer scheduleDate */
    day: {
      ...font.semiBold,
      fontSize: body,
      lineHeight: lh(body),
      color: c.textPrimary,
    },
    /** @deprecated Préférer personName */
    patientName: {
      ...font.semiBold,
      fontSize: fontSize.md,
      lineHeight: lh(fontSize.md),
      color: c.textPrimary,
    },
    /** @deprecated */
    care: {
      ...font.medium,
      fontSize: body,
      lineHeight: lh(body),
      color: c.textPrimary,
    },
    /** @deprecated */
    careSep: {
      ...font.medium,
      fontSize: meta,
      lineHeight: lh(meta),
      color: c.textTertiary,
    },
  } as const;
}
