import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { getCancellationMotifLine, isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { radius, spacing, AppText } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { fontFamily, fontSize } from '@/theme/typography';

export function RdvCancellationBanner({
  apt,
  compact,
}: {
  apt: Appointment;
  compact?: boolean;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_RdvCancellationBanner_tsx_RdvCancellationBanner_styles');

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

function buildStyles(c: AppColors) {
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
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  motif: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.5,
  },
};
}
