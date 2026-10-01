import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Row } from '@/components/layout/primitives';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Clock, X } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/skeletons';
import {
  acceptOfferBatch,
  refuseOfferBatch,
  snoozeOfferBatch,
} from '@/features/nurse/utils/offer-appointment-workflow';
import { useAppointmentBatch } from '../hooks/use-appointment-batch';
import { batchLotSummaryLabel } from '@/utils/appointment-batch';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { useOfferQueueStore } from '../../store/offer-queue-store';
import { useAuthStore } from '@/store/auth-store';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { fetchAppointment } from '../../api/appointments.service';
import { NURSE_TOUR_QUERY_ROOT } from '@/features/tournee-nurse/hooks/nurse-tour-query';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { OfferAcceptPreparationOverlay } from './offer/OfferAcceptPreparationOverlay';
import { OfferAppointmentPreviewBody } from './offer/OfferAppointmentPreviewBody';
import { ICON_STROKE_WIDTH, spacing, iconSize, AppText, useStyles, type Theme } from '@/theme';

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

/** Offres entrantes : réservées à l'infirmier, la fiche ouverte après acceptation est la sienne. */
export function OfferAppointmentModal() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const visible = useOfferQueueStore((s) => s.visible);
  const selected = useOfferQueueStore((s) => s.selected);
  const presentNonce = useOfferQueueStore((s) => s.presentNonce);
  const shareToken = useOfferQueueStore((s) => s.shareToken);
  const closeModal = useOfferQueueStore((s) => s.closeModal);
  const userId = user?.id;
  const termsAccepted = useAppPreferencesStore(
    (s) => Boolean(userId) && s.offerTermsAcceptedUserId === userId,
  );
  const setOfferTermsAccepted = useAppPreferencesStore((s) => s.setOfferTermsAccepted);
  const setTermsAccepted = useCallback(
    (accepted: boolean) => {
      if (userId) setOfferTermsAccepted(userId, accepted);
    },
    [setOfferTermsAccepted, userId],
  );

  const [showTerms, setShowTerms] = useState(!termsAccepted);
  const [confirmRefuse, setConfirmRefuse] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepComplete, setPrepComplete] = useState(false);
  const acceptedAptIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible && !preparing) {
      setPrepComplete(false);
    }
  }, [visible, preparing]);

  useEffect(() => {
    setConfirmRefuse(false);
    const acceptedBy = useAppPreferencesStore.getState().offerTermsAcceptedUserId;
    setShowTerms(!userId || acceptedBy !== userId);
  }, [presentNonce, userId]);

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


  /** Fermeture backdrop / swipe — snooze puis file suivante. */
  const dismissOffer = useCallback(() => {
    if (!row) {
      closeModal();
      return;
    }
    void (async () => {
      await snoozeOfferBatch(row, user?.id);
      closeModal();
      if (!user?.role || !user.id) return;
      setTimeout(() => {
        void useOfferQueueStore.getState().processNext(user.role, user.id);
      }, 400);
    })();
  }, [closeModal, row, user?.id, user?.role]);

  /** « Plus tard » — snooze serveur puis offre suivante. */
  const deferOffer = useCallback(() => {
    if (!row) {
      closeModal();
      return;
    }
    void (async () => {
      const r = await snoozeOfferBatch(row, user?.id);
      if (!r.ok) {
        toast(r.error, { type: 'error' });
      }
      closeModal();
      if (!user?.role || !user.id) return;
      setTimeout(() => {
        void useOfferQueueStore.getState().processNext(user.role, user.id);
      }, 400);
    })();
  }, [closeModal, row, toast, user?.id, user?.role]);

  const finishAndNext = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
    closeModal();
    if (user?.role && user.id) {
      void useOfferQueueStore.getState().processNext(user.role, user.id);
    }
  }, [closeModal, qc, user?.id, user?.role]);

  const handleRefuse = useCallback(async () => {
    if (!row) return;
    setRefusing(true);
    const r = await refuseOfferBatch(row, user?.id);
    setRefusing(false);
    if (!r.ok) {
      toast(r.error, { type: 'error' });
      return;
    }
    setConfirmRefuse(false);
    toast(r.count > 1 ? `Offre refusée (${r.count} soins)` : 'Offre refusée', { type: 'info' });
    await finishAndNext();
  }, [finishAndNext, row, toast, user?.id]);

  const handleAccept = useCallback(async () => {
    if (!row || !selected || !termsAccepted) return;

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
        qc.invalidateQueries({ queryKey: queryKeys.patients.all }),
        qc.invalidateQueries({ queryKey: ['patients', 'hub-search'] }),
        qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT }),
      ]);
    } catch (prefetchError) {
      // Navigation maintenue : le cache optimiste porte déjà le statut confirmé.
      console.warn('[offer] préchargement après acceptation incomplet', prefetchError);
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

    InteractionManager.runAfterInteractions(() => {
      router.push(appointmentDetailHref('/(nurse)', aptId));
    });
  }, [batchCount, closeModal, router, selected?.id, toast, user?.id, user?.role]);

  if (!preparing && (!visible || !selected || !row)) {
    return null;
  }

  const busy = loading || refusing;

  const footer = confirmRefuse ? (
    <View style={styles.footer}>
      <AppText style={styles.refuseText}>
        {batchCount > 1
          ? 'Ces soins ne vous seront plus proposés.'
          : 'Cette demande ne vous sera plus proposée.'}
      </AppText>
      <Button
        title="Confirmer le refus"
        variant="destructive"
        size="lg"
        fullWidth
        loading={refusing}
        onPress={() => void handleRefuse()}
      />
      <Button
        title="Retour"
        variant="ghost"
        fullWidth
        disabled={refusing}
        onPress={() => setConfirmRefuse(false)}
      />
    </View>
  ) : (
    <View style={styles.footer}>
      <Button
        title={batchCount > 1 ? `Accepter (${batchCount} soins)` : 'Accepter'}
        loading={loading}
        disabled={!termsAccepted || refusing}
        leftIcon={<Check size={iconSize.md} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
        onPress={() => void handleAccept()}
        fullWidth
        size="lg"
      />
      <Row gap={spacing[2]}>
        <View style={styles.footerSlot}>
          <Button
            title="Plus tard"
            variant="outline"
            disabled={busy}
            leftIcon={<Clock size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => void deferOffer()}
            fullWidth
          />
        </View>
        <View style={styles.footerSlot}>
          <Button
            title="Refuser"
            variant="dangerOutline"
            disabled={busy}
            leftIcon={<X size={iconSize.md} color={c.error} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => setConfirmRefuse(true)}
            fullWidth
          />
        </View>
      </Row>
    </View>
  );

  return (
    <>
      {!preparing && selected ? (
        <SheetModal
          visible={visible}
          presentKey={`${selected.id}:${presentNonce}`}
          onClose={dismissOffer}
          title={confirmRefuse ? 'Refuser la demande ?' : 'Nouvelle demande'}
          subtitle={lotLabel || undefined}
        >
          {siblingsLoading ? (
            <SkeletonList count={2} itemHeight={100} gap={spacing[3]} />
          ) : (
            <OfferAppointmentPreviewBody primary={selected} batch={batchSorted} />
          )}
          {showTerms ? (
            <Row align="center" gap={spacing[3]} style={styles.termsRow}>
              <ToggleSwitch
                value={termsAccepted}
                onValueChange={setTermsAccepted}
                accessibilityLabel="Je m’engage à prendre en charge ce patient et à respecter sa confidentialité"
              />
              <AppText style={styles.termsText}>
                Je m’engage à prendre en charge ce patient et à respecter sa confidentialité.
              </AppText>
            </Row>
          ) : null}
          {footer}
        </SheetModal>
      ) : null}
      <OfferAcceptPreparationOverlay
        visible={preparing}
        complete={prepComplete}
        onFinish={onPrepFinish}
      />
    </>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
  termsRow: {
    minWidth: 0,
    marginTop: spacing[2],
  },
  termsText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    ...text.secondary,
    color: c.textPrimary,
  },
  footer: { gap: spacing[2] },
  footerSlot: { flex: 1, minWidth: 0 },
  refuseText: {
    ...text.body,
    color: c.textPrimary,
  },
};
}

