import { colors } from '@/theme';
import { fontFamily } from '@/theme/typography';

const BODY_SIZE = 11;
const BODY_LINE = 15;

/** Échelle typo homogène — cartes liste RDV (date, créneau, soins à 11px). */
export const rdvListCardType = {
  day: {
    fontFamily: fontFamily.semiBold,
    fontSize: BODY_SIZE,
    lineHeight: BODY_LINE,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  patientName: {
    fontFamily: fontFamily.semiBold,
    fontSize: BODY_SIZE,
    lineHeight: BODY_LINE,
    color: colors.textPrimary,
  },
  slot: {
    fontFamily: fontFamily.semiBold,
    fontSize: BODY_SIZE,
    lineHeight: BODY_LINE,
    color: colors.primaryDark,
  },
  care: {
    fontFamily: fontFamily.medium,
    fontSize: BODY_SIZE,
    lineHeight: BODY_LINE,
    color: colors.textPrimary,
  },
  careTag: {
    fontFamily: fontFamily.medium,
    fontSize: BODY_SIZE,
    lineHeight: BODY_LINE,
    color: colors.textPrimary,
  },
  careEmoji: {
    fontSize: BODY_SIZE,
    lineHeight: BODY_LINE,
  },
  careSep: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textTertiary,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
  },
} as const;
