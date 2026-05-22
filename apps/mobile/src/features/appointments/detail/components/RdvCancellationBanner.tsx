import { StyleSheet, Text, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { getCancellationMotifLine, isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function RdvCancellationBanner({
  apt,
  compact,
}: {
  apt: Appointment;
  compact?: boolean;
}) {
  if (!isAppointmentCanceled(apt.status)) return null;
  const motif = getCancellationMotifLine(apt);

  return (
    <View style={[styles.banner, compact && styles.bannerCompact]}>
      <Text style={styles.title}>Ce rendez-vous a été annulé.</Text>
      {motif ? <Text style={styles.motif}>{motif}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerCompact: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
  },
  banner: {
    backgroundColor: '#f5f5f5',
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing[1],
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  motif: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.5,
  },
});
