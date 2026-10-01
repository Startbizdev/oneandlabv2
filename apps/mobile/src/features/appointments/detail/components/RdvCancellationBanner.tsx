import { StyleSheet, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { getCancellationMotifLine, isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

export function RdvCancellationBanner({
  apt,
  compact,
}: {
  apt: Appointment;
  compact?: boolean;
}) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  if (!isAppointmentCanceled(apt.status)) return null;
  const motif = getCancellationMotifLine(apt);

  return (
    <View
      style={[
        styles.banner,
        compact && styles.bannerCompact,
        { backgroundColor: c.errorLight, borderColor: c.errorMid },
      ]}
    >
      <AppText style={[styles.title, { color: c.error }]}>Ce rendez-vous a été annulé.</AppText>
      {motif ? <AppText style={[styles.motif, { color: c.textSecondary }]}>{motif}</AppText> : null}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  bannerCompact: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
  },
  banner: {
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    gap: spacing[1],
  },
  title: {
    ...font.semiBold,
    fontSize: fontSize.sm,
  },
  motif: {
    ...font.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.5,
  },
};
}
