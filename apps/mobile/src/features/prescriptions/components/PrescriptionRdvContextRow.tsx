import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { Appointment } from '@oneandlab/shared-types';
import { Stack } from '@/components/layout/primitives';
import { RdvListCardCreneauRow } from '@/features/appointments/components/RdvListCardCreneauRow';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import { prescriptionAppointmentPickerScheduleLabel } from '../utils/prescription-display';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
;

interface Props {
  apt: Appointment;
  lotLabel?: string;
}

/** Bloc RDV partagé — date, point statut, badges emoji, lot (sélecteur + historique). */
export function PrescriptionRdvContextRow({ apt, lotLabel }: Props) {
  const styles = useThemedStyles(buildStyles, 'PrescriptionRdvContextRow');
  const schedule = prescriptionAppointmentPickerScheduleLabel(apt);
  const status = String(apt.status ?? '');

  return (
    <Stack gap={spacing[1]} style={styles.root}>
      {lotLabel ? (
        <AppText style={styles.lotLabel} numberOfLines={1}>
          {lotLabel}
        </AppText>
      ) : null}
      <RdvListCardCreneauRow label={schedule} status={status} />
      <RdvCareTagsRow apt={apt} tone="neutral" density="compact" />
    </Stack>
  );
}

function buildStyles(c: AppColors) {
  return {
    root: {
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    lotLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.primary,
      letterSpacing: 0.2,
    },
  };
}
