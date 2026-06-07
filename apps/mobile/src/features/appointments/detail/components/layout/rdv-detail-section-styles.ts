import { StyleSheet } from 'react-native';
import type { AppColors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { fontFamily, fontSize } from '@/theme/typography';

function buildRdvDetailSectionStyles(c: AppColors) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden' as const,
    },
    cardEdge: {
      borderRadius: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
    },
    sectionHead: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2.5],
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[2],
    },
    sectionIconWrap: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    sectionTitle: {
      flex: 1,
      fontFamily: fontFamily.bold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    sectionRow: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
  };
}

export function getRdvDetailSectionStyles() {
  return getThemedStyles('rdv-detail-section', buildRdvDetailSectionStyles);
}

/** @deprecated Préférer getRdvDetailSectionStyles() au rendu. */
export const rdvDetailSectionStyles = new Proxy(
  {} as ReturnType<typeof buildRdvDetailSectionStyles>,
  {
    get(_target, prop: string | symbol) {
      if (typeof prop === 'string') {
        return getRdvDetailSectionStyles()[prop as keyof ReturnType<typeof buildRdvDetailSectionStyles>];
      }
      return undefined;
    },
  },
);
