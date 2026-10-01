import { StyleSheet } from 'react-native';
import { font, makeStyles, radius, spacing } from '@/theme';

export const useRdvDetailSectionStyles = makeStyles(({ colors: c, fontSize }) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    minWidth: 0,
    flex: 1,
    ...font.bold,
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
}));
