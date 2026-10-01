import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import {
  acceptOfferAppointment,
  refuseOfferAppointment,
} from '@/features/nurse/utils/offer-appointment-workflow';
import { NURSE_TOUR_QUERY_ROOT } from '@/features/tournee-nurse/hooks/nurse-tour-query';
import { spacing, iconSize, useStyles } from '@/theme';

type OfferDecision = 'accept' | 'refuse';

export function OfferActions({ appointmentId, onDone }: { appointmentId: string; onDone?: () => void }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [confirmRefuse, setConfirmRefuse] = useState(false);

  const mut = useMutation({
    mutationFn: (decision: OfferDecision) =>
      decision === 'accept'
        ? acceptOfferAppointment(appointmentId)
        : refuseOfferAppointment(appointmentId),
    onSuccess: (r, decision) => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      if (!r.ok) {
        toast(r.error, { type: r.alreadyTaken ? 'info' : 'error' });
        return;
      }
      setConfirmRefuse(false);
      if (decision === 'accept') void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(decision === 'accept' ? 'Rendez-vous accepté' : 'Offre refusée', {
        type: decision === 'accept' ? 'success' : 'info',
      });
      onDone?.();
    },
    onError: (e) => handleApiError(e, toast, 'offerDecision'),
  });

  return (
    <>
      <Row gap={spacing[3]} style={styles.row}>
        <View style={styles.btn}>
          <Button
            title="Accepter"
            loading={mut.isPending && mut.variables === 'accept'}
            disabled={mut.isPending}
            leftIcon={<Check size={iconSize.sm} color={c.onPrimary} strokeWidth={2.5} />}
            onPress={() => mut.mutate('accept')}
            fullWidth
          />
        </View>
        <View style={styles.btn}>
          <Button
            title="Refuser"
            variant="dangerOutline"
            disabled={mut.isPending}
            leftIcon={<X size={iconSize.sm} color={c.error} strokeWidth={2.5} />}
            onPress={() => setConfirmRefuse(true)}
            fullWidth
          />
        </View>
      </Row>
      <ConfirmSheet
        visible={confirmRefuse}
        title="Refuser cette offre ?"
        message="Elle ne vous sera plus proposée."
        confirmLabel="Refuser l’offre"
        cancelLabel="Retour"
        loading={mut.isPending && mut.variables === 'refuse'}
        onConfirm={() => mut.mutate('refuse')}
        onClose={() => setConfirmRefuse(false)}
      />
    </>
  );
}

function buildStyles() {
  return {
    row: {
      minWidth: 0,
    },
    btn: { minWidth: 0, flex: 1 },
  };
}
