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
      minWidth: 0,
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
