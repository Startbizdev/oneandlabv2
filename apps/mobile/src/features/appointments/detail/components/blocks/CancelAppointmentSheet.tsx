import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react-native';
import {
  cancellationReasonRequiresPhoto,
  staffCancellationCanSubmit,
} from '@oneandlab/shared-constants';
import type { Appointment } from '@oneandlab/shared-types';
import { Button } from '@/components/ui/Button';
import { DetailPanel } from '../layout/DetailPanel';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import {
  cancelAppointment,
  cancelAppointmentsPatientBatch,
} from '../../api/appointment-detail.service';
import {
  StaffCancellationFields,
  type StaffCancellationValues,
} from './StaffCancellationFields';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  role: string;
  /** RDV à annuler (lot patient = plusieurs). */
  targets: Appointment[];
  onDone: () => void;
  onDismiss: () => void;
}

const EMPTY_STAFF: StaffCancellationValues = { reason: '', comment: '' };

export function CancelAppointmentSheet({ role, targets, onDone, onDismiss }: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [staff, setStaff] = useState<StaffCancellationValues>(EMPTY_STAFF);
  const isPatient = role === 'patient';
  const isBatch = targets.length > 1;
  const canSubmitStaff = staffCancellationCanSubmit(staff.reason, staff.comment);

  const mut = useMutation({
    mutationFn: async () => {
      if (isPatient) {
        return cancelAppointmentsPatientBatch(targets.map((t) => t.id));
      }
      const first = targets[0];
      if (!first) throw new Error('NO_TARGET');
      return cancelAppointment(first.id, {
        reason: staff.reason,
        comment: staff.comment.trim(),
        photoUri: staff.photoUri,
      }).then((r) => ({
        ok: r.ok,
        canceled: r.ok ? 1 : 0,
        error: r.error,
      }));
    },
    onSuccess: (r) => {
      if (!r.ok) {
        toast(r.error ?? 'Annulation impossible', { type: 'error' });
        return;
      }
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      const n = r.canceled;
      toast(
        n > 1 ? `${n} rendez-vous annulés` : 'Rendez-vous annulé',
        { type: 'success' },
      );
      onDone();
    },
    onError: (e) => handleApiError(e, toast, 'cancelAppointment'),
  });

  function patchStaff(patch: Partial<StaffCancellationValues>) {
    setStaff((prev) => {
      const next = { ...prev, ...patch };
      if (patch.reason != null && !cancellationReasonRequiresPhoto(patch.reason)) {
        next.photoUri = undefined;
      }
      return next;
    });
  }

  return (
    <Animated.View entering={FadeInDown.duration(280).springify()}>
      <DetailPanel title={isBatch ? 'Annuler le lot' : 'Annuler le rendez-vous'}>
        <View style={styles.warning}>
          <AlertTriangle size={16} color={colors.error} strokeWidth={2} />
          <Text style={styles.warningText}>
            {isBatch
              ? `Vous allez annuler ${targets.length} rendez-vous. Cette action est définitive.`
              : 'Cette action est irréversible.'}
          </Text>
        </View>
        {!isPatient ? (
          <StaffCancellationFields values={staff} onChange={patchStaff} />
        ) : null}
        <View style={styles.actions}>
          <Button title="Retour" variant="outline" onPress={onDismiss} />
          <Button
            title="Confirmer l'annulation"
            variant="destructive"
            loading={mut.isPending}
            disabled={!isPatient && !canSubmitStaff}
            onPress={() => mut.mutate()}
          />
        </View>
      </DetailPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  warning: {
    flexDirection: 'row',
    gap: spacing[2],
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    padding: spacing[3],
  },
  warningText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: fontSize.sm * 1.45,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
});
