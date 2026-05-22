import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { NurseOfferConfirmSheet } from '@/features/nurse/components/NurseOfferConfirmSheet';
import {
  acceptOfferBatch,
  refuseOfferBatch,
} from '@/features/nurse/utils/offer-appointment-workflow';
import { useAppointmentBatch } from '../hooks/use-appointment-batch';
import { batchLotSummaryLabel } from '@/utils/appointment-batch';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { useOfferQueueStore } from '../../store/offer-queue-store';
import { useAuthStore } from '@/store/auth-store';
import { OfferAppointmentPreviewBody } from './offer/OfferAppointmentPreviewBody';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  detailPathPrefix: string;
}

function rowFromAppointment(apt: Appointment): AppointmentListRow {
  const siblings = (apt.batch_siblings ?? []) as Appointment[];
  if (siblings.length === 0) {
    return { kind: 'single', appointment: apt };
  }
  const all: Appointment[] = [apt, ...siblings];
  const key = apt.creation_batch_id
    ? `batch:${apt.creation_batch_id}`
    : `cluster:${all.map((a) => a.id).sort().join(',')}`;
  return { kind: 'batch', key, appointments: all };
}

export function OfferAppointmentModal({ detailPathPrefix }: Props) {
  const router = useRouter();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const visible = useOfferQueueStore((s) => s.visible);
  const selected = useOfferQueueStore((s) => s.selected);
  const shareToken = useOfferQueueStore((s) => s.shareToken);
  const closeModal = useOfferQueueStore((s) => s.closeModal);
  const processNext = useOfferQueueStore((s) => s.processNext);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { batchSorted, isMultiBatch, siblingsLoading } = useAppointmentBatch(selected);

  const row = useMemo(
    () => (selected ? rowFromAppointment(selected) : null),
    [selected],
  );

  const batchCount = useMemo(() => {
    if (!row) return 1;
    return row.kind === 'batch' ? row.appointments.length : 1;
  }, [row]);

  const lotLabel = useMemo(() => {
    if (!selected || !isMultiBatch) return '';
    return batchLotSummaryLabel(batchSorted);
  }, [batchSorted, isMultiBatch, selected]);

  const subtitle = useMemo(() => {
    if (isMultiBatch && batchSorted.length > 1) {
      return `${batchSorted.length} soins dans ce lot — une seule acceptation pour tout le lot.`;
    }
    return 'Acceptez rapidement avant qu’un autre professionnel ne le prenne.';
  }, [batchSorted.length, isMultiBatch]);

  const dismissLater = useCallback(() => {
    closeModal();
    if (user?.role && user.id) {
      void processNext(user.role, user.id);
    }
  }, [closeModal, processNext, user?.id, user?.role]);

  const finishAndNext = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
    closeModal();
    if (user?.role && user.id) {
      void useOfferQueueStore.getState().processNext(user.role, user.id);
    }
  }, [closeModal, qc, user?.id, user?.role]);

  const handleRefuse = useCallback(async () => {
    if (!row) return;
    setLoading(true);
    const r = await refuseOfferBatch(row, user?.id);
    setLoading(false);
    if (!r.ok) {
      toast(r.error, { type: 'error' });
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (r.declinedOffer) {
      toast('Proposition retirée — le RDV reste en attente pour le patient.', { type: 'info' });
    } else {
      toast(batchCount > 1 ? `Lot refusé (${r.count} soins)` : 'Rendez-vous refusé', {
        type: 'info',
      });
    }
    await finishAndNext();
  }, [batchCount, finishAndNext, row, toast, user?.id]);

  const handleAcceptConfirm = useCallback(async () => {
    if (!row || !selected) return;
    setLoading(true);
    const r = await acceptOfferBatch(row, user?.id, shareToken);
    setLoading(false);
    setConfirmOpen(false);

    if (!r.ok) {
      if (r.planLimit) {
        toast('Limite atteinte — passez à l’offre Pro pour accepter sans limite.', {
          type: 'error',
        });
      } else if (r.alreadyTaken) {
        toast('Ce rendez-vous a déjà été pris par un autre professionnel.', { type: 'info' });
      } else {
        toast(r.error, { type: 'error' });
      }
      await finishAndNext();
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast(
      r.count > 1 ? `Lot accepté (${r.count} soins)` : 'Rendez-vous accepté !',
      { type: 'success' },
    );
    await finishAndNext();
    router.push(`${detailPathPrefix}/${selected.id}` as never);
  }, [
    detailPathPrefix,
    finishAndNext,
    row,
    router,
    selected,
    shareToken,
    toast,
    user?.id,
  ]);

  if (!visible || !selected || !row) return null;

  const footer = (
    <View style={styles.footer}>
      <Button
        title={batchCount > 1 ? `Accepter (${batchCount} soins)` : 'Accepter'}
        loading={loading}
        leftIcon={<Check size={16} color={colors.textInverse} strokeWidth={2.5} />}
        onPress={() => setConfirmOpen(true)}
        fullWidth
        size="lg"
      />
      <Button
        title={batchCount > 1 ? 'Refuser le lot' : 'Refuser'}
        variant="outline"
        loading={loading}
        leftIcon={<X size={16} color={colors.error} strokeWidth={2} />}
        onPress={() => void handleRefuse()}
        fullWidth
      />
      <Pressable onPress={dismissLater} style={styles.laterBtn} disabled={loading}>
        <Text style={styles.laterText}>Plus tard</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={dismissLater}
        title="Nouveau rendez-vous"
        subtitle={subtitle}
        footer={footer}
      >
        {lotLabel && !isMultiBatch ? (
          <View style={styles.lotPill}>
            <Text style={styles.lotPillText}>{lotLabel}</Text>
          </View>
        ) : null}
        {siblingsLoading ? (
          <View style={styles.loading}>
            <Skeleton height={120} borderRadius={16} />
            <Skeleton height={80} borderRadius={16} />
          </View>
        ) : (
          <OfferAppointmentPreviewBody primary={selected} batch={batchSorted} />
        )}
      </BottomSheet>

      <NurseOfferConfirmSheet
        visible={confirmOpen}
        loading={loading}
        batchCount={batchCount}
        onClose={() => {
          if (loading) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => void handleAcceptConfirm()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  lotPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    marginBottom: spacing[2],
  },
  lotPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  loading: { gap: spacing[2] },
  footer: { gap: spacing[2] },
  laterBtn: { alignItems: 'center', paddingVertical: spacing[1] },
  laterText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
});
