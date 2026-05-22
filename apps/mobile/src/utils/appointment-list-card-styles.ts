import { StyleSheet } from 'react-native';
import { colors, elevation, radius, spacing } from '@/theme';

/** Coque ombre + carte intérieure (évite le clipping iOS avec overflow:hidden). */
export const appointmentListCardStyles = StyleSheet.create({
  cardShell: {
    marginBottom: spacing[3],
    borderRadius: radius.xl,
    ...elevation.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  /** Zone date / créneau / catalogue sous l’en-tête patient ou adresse. */
  metaSection: {
    gap: spacing[1.5],
    paddingTop: spacing[2.5],
    marginTop: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  batchList: {
    gap: spacing[2.5],
    paddingTop: spacing[2.5],
    marginTop: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
});
