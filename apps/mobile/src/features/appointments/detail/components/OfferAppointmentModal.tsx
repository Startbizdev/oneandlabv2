import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Layers, X } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { formatAppointmentDateTime } from '@/utils/appointment-datetime-fr';
import { Button } from '@/components/ui/Button';
import { NurseOfferConfirmSheet } from '@/features/nurse/components/NurseOfferConfirmSheet';
import {
  acceptOfferBatch,
  refuseOfferBatch,
} from '@/features/nurse/utils/offer-appointment-workflow';
import { beneficiaryDisplayName } from '@/features/appointments/detail/utils/patient-appointment-display';
import { batchLotSummaryLabel } from '@/utils/appointment-batch';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { useOfferQueueStore } from '../../store/offer-queue-store';
import { useAuthStore } from '@/store/auth-store';
import { colors, elevation, radius, spacing } from '@/theme';
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

  const row = useMemo(
    () => (selected ? rowFromAppointment(selected) : null),
    [selected],
  );

  const batchCount = useMemo(() => {
    if (!row) return 1;
    return row.kind === 'batch' ? row.appointments.length : 1;
  }, [row]);

  const lotLabel = useMemo(() => {
    if (!row || row.kind !== 'batch') return '';
    return batchLotSummaryLabel(row.appointments);
  }, [row]);

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

  const patientName = beneficiaryDisplayName(selected);
  const fd = selected.form_data as Record<string, unknown> | undefined;

  return (
    <>
      <Modal visible transparent animationType="slide">
        <View style={styles.root}>
          <Pressable
            style={styles.dismissArea}
            onPress={() => {
              closeModal();
              if (user?.role && user.id) {
                void processNext(user.role, user.id);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          />
          <View style={[styles.sheet, elevation.sheetTop]}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            <Text style={styles.sheetTitle}>Nouvelle demande</Text>
            <Text style={styles.patientName}>{patientName}</Text>

            {lotLabel ? (
              <View style={styles.lotRow}>
                <Layers size={14} color={colors.primary} strokeWidth={2.25} />
                <Text style={styles.lotLabel}>{lotLabel}</Text>
              </View>
            ) : null}

            <View style={styles.timeRow}>
              <Clock size={14} color={colors.primary} strokeWidth={2} />
              <Text style={styles.timeLabel}>
                {formatAppointmentDateTime(
                  selected.scheduled_at,
                  (fd?.availability as Parameters<typeof formatAppointmentDateTime>[1]) ??
                    undefined,
                )}
              </Text>
            </View>

            {selected.category_name ? (
              <Text style={styles.category}>{selected.category_name}</Text>
            ) : null}

            <View style={styles.actions}>
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
            </View>

            <Pressable
              onPress={() => {
                closeModal();
                if (user?.role && user.id) {
                  void processNext(user.role, user.id);
                }
              }}
              style={styles.laterBtn}
              disabled={loading}
            >
              <Text style={styles.laterText}>Plus tard</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  dismissArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    overflow: 'visible',
    padding: spacing[5],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  handleWrap: { alignItems: 'center', marginBottom: spacing[1] },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  sheetTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  patientName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  lotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  lotLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  timeLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  category: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actions: { gap: spacing[2], marginTop: spacing[1] },
  laterBtn: { alignItems: 'center', paddingVertical: spacing[2] },
  laterText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
});
