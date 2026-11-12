import type { Appointment } from '@oneandlab/shared-types';
import { Stack } from '@/components/layout/primitives';
import { RdvListCardCreneauRow } from '@/features/appointments/components/RdvListCardCreneauRow';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import { prescriptionAppointmentPickerScheduleLabel } from '../utils/prescription-display';
import { beneficiaryDisplayName } from '@/utils/beneficiary-display-name';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';
;

interface Props {
  apt: Appointment;
  lotLabel?: string;
}

/** Bloc RDV partagé — personne concernée, date, point statut, badges soins, lot (sélecteur + historique). */
export function PrescriptionRdvContextRow({ apt, lotLabel }: Props) {
  const styles = useStyles(buildStyles);
  const schedule = prescriptionAppointmentPickerScheduleLabel(apt);
  const status = String(apt.status ?? '');
  // Le patient ou l'un de ses proches : on voit pour qui est le RDV.
  const beneficiary = beneficiaryDisplayName(apt).trim();

  return (
    <Stack gap={spacing[1]} style={styles.root}>
      {lotLabel ? (
        <AppText style={styles.lotLabel} numberOfLines={1}>
          {lotLabel}
        </AppText>
      ) : null}
      {beneficiary ? (
        <AppText style={styles.beneficiary} numberOfLines={1}>
          Pour {beneficiary}
        </AppText>
      ) : null}
      <RdvListCardCreneauRow label={schedule} status={status} />
      <RdvCareTagsRow apt={apt} tone="neutral" density="compact" />
    </Stack>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: {
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    beneficiary: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    lotLabel: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.primary,
      letterSpacing: 0.2,
    },
  };
}
