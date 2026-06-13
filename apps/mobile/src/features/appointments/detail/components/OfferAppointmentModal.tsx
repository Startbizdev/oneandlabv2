import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Row } from '@/components/layout/primitives';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/skeletons';
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
import { fetchAppointment } from '../../api/appointments.service';
import { OfferAcceptPreparationOverlay } from './offer/OfferAcceptPreparationOverlay';
import { OfferAppointmentPreviewBody } from './offer/OfferAppointmentPreviewBody';
import { spacing } from '@/theme';
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

export function OfferAppointmentModal({
  detailPathPrefix }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_OfferAppointmentModal_tsx_styles');
  const router = useRouter();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const visible = useOfferQueueStore((s) => s.visible);
  const selected = useOfferQueueStore((s) => s.selected);
  const presentNonce = useOfferQueueStore((s) => s.presentNonce);
  const shareToken = useOfferQueueStore((s) => s.shareToken);
  const closeModal = useOfferQueueStore((s) => s.closeModal);
  const processNext = useOfferQueueStore((s) => s.processNext);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepComplete, setPrepComplete] = useState(false);
  const acceptedAptIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible && !preparing) {
      setTermsAccepted(false);
      setPrepComplete(false);
    }
  }, [visible, preparing]);

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

  /** Fermeture backdrop / swipe — ne pas enchaîner processNext (évite double modal Gorhom). */
  const dismissOffer = useCallback(() => {
    closeModal();
  }, [closeModal]);

  /** « Plus tard » — passer à l’offre suivante dans la file après fermeture. */
  const deferOffer = useCallback(() => {
    closeModal();
    if (!user?.role || !user.id) return;
    const { role, id } = user;
    setTimeout(() => {
      void useOfferQueueStore.getState().processNext(role, id);
    }, 400);
  }, [closeModal, user?.id, user?.role]);

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

  const handleAccept = useCallback(async () => {
    if (!row || !selected) return;
    if (!termsAccepted) {
      toast('Veuillez accepter la prise en charge avant de confirmer.', { type: 'error' });
      return;
    }

    setLoading(true);
    setPreparing(true);
    setPrepComplete(false);
    const startedAt = Date.now();

    const r = await acceptOfferBatch(row, user?.id, shareToken);

    if (!r.ok) {
      setPreparing(false);
      setLoading(false);
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

    const acceptedId = selected.id;
    acceptedAptIdRef.current = acceptedId;

    qc.setQueryData<Appointment>(queryKeys.appointments.detail(acceptedId), (prev) =>
      prev ? { ...prev, status: 'confirmed' } : prev,
    );

    try {
      await Promise.all([
        qc.prefetchQuery({
          queryKey: queryKeys.appointments.detail(acceptedId),
          queryFn: async () => {
            const res = await fetchAppointment(acceptedId);
            if (!res.success || !res.data) {
              throw new Error(res.error ?? 'RDV introuvable');
            }
            return res.data;
          },
        }),
        qc.invalidateQueries({ queryKey: queryKeys.appointments.all }),
      ]);
    } catch {
      /* Navigation quand même — cache optimiste déjà à jour. */
    }

    const minOverlayMs = 1400;
    const elapsed = Date.now() - startedAt;
    if (elapsed < minOverlayMs) {
      await new Promise((resolve) => setTimeout(resolve, minOverlayMs - elapsed));
    }

    setLoading(false);
    setPrepComplete(true);
  }, [finishAndNext, qc, row, selected, shareToken, termsAccepted, toast, user?.id]);

  const onPrepFinish = useCallback(() => {
    const aptId = acceptedAptIdRef.current ?? selected?.id ?? null;
    acceptedAptIdRef.current = null;

    setPreparing(false);
    setPrepComplete(false);
    closeModal();

    toast(
      batchCount > 1 ? `Lot accepté (${batchCount} soins)` : 'Rendez-vous accepté !',
      { type: 'success' },
    );

    if (!aptId) {
      if (user?.role && user.id) {
        void useOfferQueueStore.getState().processNext(user.role, user.id);
      }
      return;
    }

    const href = `${detailPathPrefix}/${aptId}` as const;
    InteractionManager.runAfterInteractions(() => {
      router.push(href as never);
    });
  }, [batchCount, closeModal, detailPathPrefix, router, selected?.id, toast, user?.id, user?.role]);

  if (!preparing && (!visible || !selected || !row)) {
    return null;
  }

  const footer = (
    <View style={styles.footer}>
      <Button
        title={batchCount > 1 ? `Accepter (${batchCount} soins)` : 'Accepter'}
        loading={loading}
        leftIcon={<Check size={16} color={c.textInverse} strokeWidth={2.5} />}
        onPress={() => void handleAccept()}
        fullWidth
        size="lg"
      />
      <Button
        title={batchCount > 1 ? 'Refuser le lot' : 'Refuser'}
        variant="outline"
        loading={loading}
        leftIcon={<X size={16} color={c.error} strokeWidth={2} />}
        onPress={() => void handleRefuse()}
        fullWidth
      />
      <Pressable onPress={deferOffer} style={styles.laterBtn} disabled={loading}>
        <Text style={styles.laterText}>Plus tard</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      {!preparing ? (
        <BottomSheet
          visible={visible}
          presentKey={selected ? `${selected.id}:${presentNonce}` : 'closed'}
          onClose={dismissOffer}
          title="Nouveau rendez-vous"
          subtitle={subtitle}
        >
          {lotLabel && !isMultiBatch ? (
            <View style={styles.lotPill}>
              <Text style={styles.lotPillText}>{lotLabel}</Text>
            </View>
          ) : null}
          {siblingsLoading ? (
            <View style={styles.loading}>
              <SkeletonList count={2} itemHeight={100} gap={12} />
            </View>
          ) : (
            <OfferAppointmentPreviewBody primary={selected!} batch={batchSorted} />
          )}
          <Row align="start" gap={spacing[3]} style={styles.termsRow}>
            <ToggleSwitch value={termsAccepted} onValueChange={setTermsAccepted} />
            <Text style={styles.termsText}>
              J’accepte la prise en charge et m’engage à respecter la confidentialité du patient.
            </Text>
          </Row>
          {footer}
        </BottomSheet>
      ) : null}
      <OfferAcceptPreparationOverlay
        visible={preparing}
        complete={prepComplete}
        onFinish={onPrepFinish}
      />
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
  lotPill: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 12,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primaryMid,
    marginBottom: spacing[2],
  },
  lotPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  loading: { gap: spacing[2] },
  termsRow: {
    minWidth: 0,
    marginTop: spacing[2],
  },
  termsText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.45,
  },
  footer: { gap: spacing[2] },
  laterBtn: { alignItems: 'center' as const, paddingVertical: spacing[1] },
  laterText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textTertiary,
  },
};
}

