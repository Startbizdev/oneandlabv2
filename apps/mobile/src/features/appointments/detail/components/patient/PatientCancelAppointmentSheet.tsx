import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { formatFrenchWeekdayDate } from '@/utils/appointment-datetime-fr';
import {
  rdvMaquetteActsLine,
  rdvMaquetteAvatarCounterparty,
  rdvMaquetteTimeLabel,
} from '@/utils/rdv-maquette-card-display';
import { AppText, radius, spacing, useStyles, font, type Theme } from '@/theme';
import { cancelAppointmentsPatientBatch } from '../../api/appointment-detail.service';

interface Props {
  visible: boolean;
  /** RDV annulables par le patient (lot = plusieurs). */
  targets: Appointment[];
  onDone: () => void;
  onClose: () => void;
}

function RecapRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <AppText style={styles.value}>{value}</AppText>
    </View>
  );
}

function assigneeLabel(apt: Appointment): string {
  const assignee = rdvMaquetteAvatarCounterparty(apt, 'patient');
  if (!assignee || assignee.assignmentPending || !assignee.name) return 'Pas encore attribué';
  return assignee.subtitle ? `${assignee.name} · ${assignee.subtitle}` : assignee.name;
}

/** Confirmation patient avec récapitulatif du RDV annulé. */
export function PatientCancelAppointmentSheet({ visible, targets, onDone, onClose }: Props) {
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const primary = targets[0];
  const isBatch = targets.length > 1;

  const mut = useMutation({
    mutationFn: () => cancelAppointmentsPatientBatch(targets.map((t) => t.id)),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      if (!r.ok) {
        toast(r.error ?? 'Annulation impossible', { type: 'error' });
        return;
      }
      if (r.failed > 0) {
        toast(
          `${r.canceled} rendez-vous annulé(s), ${r.failed} n’ont pas pu l’être${r.error ? ` : ${r.error}` : '.'}`,
          { type: 'warning' },
        );
      } else {
        toast(
          r.canceled > 1 ? `${r.canceled} rendez-vous annulés` : 'Votre rendez-vous a bien été annulé',
          { type: 'success' },
        );
      }
      onDone();
    },
    onError: (e) => handleApiError(e, toast, 'cancelAppointment'),
  });

  return (
    <ConfirmSheet
      visible={visible && primary != null}
      title={isBatch ? 'Annuler ces rendez-vous ?' : 'Annuler ce rendez-vous ?'}
      message={
        isBatch
          ? `${targets.length} rendez-vous liés seront annulés. Cette action est définitive.`
          : 'Cette action est définitive.'
      }
      confirmLabel={isBatch ? 'Annuler les rendez-vous' : 'Annuler le rendez-vous'}
      cancelLabel="Garder le rendez-vous"
      loading={mut.isPending}
      onConfirm={() => mut.mutate()}
      onClose={onClose}
    >
      {primary ? (
        <View style={styles.recap}>
          <RecapRow
            label="Date"
            value={formatFrenchWeekdayDate(primary.scheduled_at) || 'Date à confirmer'}
          />
          <RecapRow label="Créneau" value={rdvMaquetteTimeLabel(primary)} />
          <RecapRow
            label={isBatch ? 'Soins' : 'Soin'}
            value={
              isBatch
                ? targets.map((t) => rdvMaquetteActsLine(t, 'patient')).join(', ')
                : rdvMaquetteActsLine(primary, 'patient')
            }
          />
          <RecapRow label="Soignant" value={assigneeLabel(primary)} />
        </View>
      ) : null}
    </ConfirmSheet>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    recap: {
      marginTop: spacing[4],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
    },
    row: {
      paddingVertical: spacing[2],
      gap: 2,
    },
    label: {
      ...font.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
    value: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
  };
}
