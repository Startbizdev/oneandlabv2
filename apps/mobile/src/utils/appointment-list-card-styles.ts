import { StyleSheet } from 'react-native';
import { makeStyles, radius, spacing } from '@/theme';

/** Coque + carte intérieure : la carte se détache par son trait (`cardBorder`), comme `Card`. */
export const useAppointmentListCardStyles = makeStyles(({ colors: c }) => ({
  cardShell: {
    marginBottom: spacing[3],
    borderRadius: radius.xl,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.cardBorder,
    overflow: 'hidden',
  },
  metaSection: {
    gap: spacing[1.5],
    paddingTop: spacing[2.5],
    marginTop: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  batchList: {
    gap: spacing[2.5],
    paddingTop: spacing[2.5],
    marginTop: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
}));
