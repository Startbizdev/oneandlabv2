import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, View } from 'react-native';
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
import { syncCachesAfterOfferAccept } from '@/features/nurse/utils/offer-accept-cache';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
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

function offerIds(row: AppointmentListRow, selected: Appointment): string[] {
  const ids = row.kind === 'batch' ? row.appointments.map((a) => a.id) : [row.appointment.id];
  for (const sibling of selected.batch_siblings ?? []) ids.push(sibling.id);
  return ids.filter(Boolean).map(String);
}

/**
 * Offres entrantes : réservées à l'infirmier, la fiche ouverte après acceptation est la sienne.
 * Accepter se confirme dans la sheet, qui se ferme ensuite : la suite (fiche, offre suivante) ne part
 * qu'une fois la sheet native retirée (`onDismissed`), sans vue plein écran par-dessus.
 */
export function OfferAppointmentModal() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const visible = useOfferQueueStore((s) => s.visible);
  const selected = useOfferQueueStore((s) => s.selected);
  const selectedId = selected?.id;
  const shareToken = useOfferQueueStore((s) => s.shareToken);
  const closeModal = useOfferQueueStore((s) => s.closeModal);
  const markHandled = useOfferQueueStore((s) => s.markHandled);
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
  const [accepting, setAccepting] = useState(false);
  /** Fermeture demandée depuis la sheet : l'offre reste sélectionnée jusqu'à `onDismissed`. */
  const [leaving, setLeaving] = useState(false);
  const afterCloseRef = useRef<(() => void) | null>(null);
  /** Double appui : le 2e PUT renverrait « déjà accepté » et fermerait l'offre en erreur. */
  const acceptInFlightRef = useRef(false);

  useEffect(() => {
    setConfirmRefuse(false);
    setAccepting(false);
    setLeaving(false);
    acceptInFlightRef.current = false;
    const acceptedBy = useAppPreferencesStore.getState().offerTermsAcceptedUserId;
    setShowTerms(!userId || acceptedBy !== userId);
  }, [selectedId, userId]);

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

  const showNext = useCallback(() => {
    if (user?.role && user.id) {
      void useOfferQueueStore.getState().processNext(user.role, user.id);
    }
  }, [user?.id, user?.role]);

  /** Ferme la sheet puis lance `after` une fois la route native retirée. */
  const leave = useCallback((after?: () => void) => {
    afterCloseRef.current = after ?? null;
    setLeaving(true);
  }, []);

  /**
   * La sélection est vidée d'abord : remettre `leaving` à false avant rendrait la sheet de nouveau
   * visible et la représenterait (offre qui se rouvre après Accepter). L'état local se remet à zéro
   * au changement d'offre ; la suite part après la fin de la transition native.
   */
  const onDismissed = useCallback(() => {
    const after = afterCloseRef.current;
    afterCloseRef.current = null;
    closeModal();
    if (after) InteractionManager.runAfterInteractions(after);
  }, [closeModal]);

  /** Geste ou retour Android : la sheet est déjà retirée, on met l'offre de côté puis on passe à la suivante. */
  const dismissOffer = useCallback(() => {
    const current = row;
    closeModal();
    if (!current) return;
    void snoozeOfferBatch(current, user?.id).finally(showNext);
  }, [closeModal, row, showNext, user?.id]);

  const deferOffer = useCallback(() => {
    const current = row;
    if (!current) return;
    leave(() => {
      void snoozeOfferBatch(current, user?.id).then((r) => {
        if (!r.ok) toast(r.error, { type: 'error' });
        showNext();
      });
    });
  }, [leave, row, showNext, toast, user?.id]);

  const handleRefuse = useCallback(async () => {
    if (!row || !selected) return;
    setRefusing(true);
    const r = await refuseOfferBatch(row, user?.id);
    setRefusing(false);
    if (!r.ok) {
      toast(r.error, { type: 'error' });
      return;
    }
    markHandled(offerIds(row, selected));
    leave(() => {
      toast(r.count > 1 ? `Offre refusée (${r.count} soins)` : 'Offre refusée', { type: 'info' });
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      showNext();
    });
  }, [leave, markHandled, qc, row, selected, showNext, toast, user?.id]);

  const handleAccept = useCallback(async () => {
    if (!row || !selected || !termsAccepted || acceptInFlightRef.current) return;
    acceptInFlightRef.current = true;
    setAccepting(true);

    const r = await acceptOfferBatch(row, user?.id, shareToken);

    if (!r.ok) {
      if (r.alreadyTaken) markHandled(offerIds(row, selected));
      leave(() => {
        if (r.planLimit) {
          void qc.invalidateQueries({ queryKey: queryKeys.planLimits.current });
          toast('Limite atteinte — passez à l’offre Pro pour accepter sans limite.', { type: 'error' });
        } else if (r.alreadyTaken) {
          toast('Ce rendez-vous a déjà été pris par un autre professionnel.', { type: 'info' });
        } else {
          toast(r.error, { type: 'error' });
        }
        void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
        showNext();
      });
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Lot : la fiche ouverte est celle du premier passage.
    const acceptedId = batchSorted[0]?.id ?? selected.id;
    markHandled(offerIds(row, selected));

    // Seule la fiche ouverte ensuite est attendue ; listes et tournée se rafraîchissent en arrière-plan.
    try {
      await syncCachesAfterOfferAccept(qc, acceptedId, async (id) => {
        const res = await fetchAppointment(id, { includeBatch: true });
        if (!res.success || !res.data) throw new Error(res.error ?? 'RDV introuvable');
        return res.data;
      });
    } catch {
      // La fiche se charge d'elle-même si le préchargement échoue.
    }

    leave(() => {
      toast(batchCount > 1 ? `Lot accepté (${batchCount} soins)` : 'Rendez-vous accepté !', { type: 'success' });
      router.push(appointmentDetailHref('/(nurse)', acceptedId));
    });
  }, [batchCount, batchSorted, leave, markHandled, qc, router, row, selected, shareToken, showNext, termsAccepted, toast, user?.id]);

  if (!visible || !selected || !row) {
    return null;
  }

  const busy = accepting || refusing || leaving;

  const footer = accepting ? undefined : confirmRefuse ? (
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
        disabled={leaving}
        onPress={() => void handleRefuse()}
      />
      <Button
        title="Retour"
        variant="ghost"
        fullWidth
        disabled={refusing || leaving}
        onPress={() => setConfirmRefuse(false)}
      />
    </View>
  ) : (
    <View style={styles.footer}>
      <Button
        title={batchCount > 1 ? `Accepter (${batchCount} soins)` : 'Accepter'}
        disabled={!termsAccepted || busy}
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
            onPress={deferOffer}
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
    <SheetModal
      visible={!leaving}
      onClose={dismissOffer}
      onDismissed={onDismissed}
      dismissible={!busy}
      title={accepting ? 'Confirmation du rendez-vous' : confirmRefuse ? 'Refuser la demande ?' : 'Nouvelle demande'}
      subtitle={accepting ? undefined : lotLabel || undefined}
      footer={footer}
    >
      {accepting ? (
        <View style={styles.accepting} accessibilityRole="progressbar" accessibilityLabel="Confirmation du rendez-vous">
          <ActivityIndicator size="large" color={c.primary} />
          <AppText variant="secondary" style={styles.acceptingText}>
            {batchCount > 1 ? `Nous réservons vos ${batchCount} soins…` : 'Nous réservons ce rendez-vous pour vous…'}
          </AppText>
        </View>
      ) : siblingsLoading ? (
        <SkeletonList count={2} itemHeight={100} gap={spacing[3]} />
      ) : (
        <OfferAppointmentPreviewBody primary={selected} batch={batchSorted} />
      )}
      {showTerms && !confirmRefuse && !accepting ? (
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
    </SheetModal>
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
  accepting: {
    alignItems: 'center' as const,
    gap: spacing[3],
    paddingVertical: spacing[8],
  },
  acceptingText: {
    textAlign: 'center' as const,
  },
};
}

