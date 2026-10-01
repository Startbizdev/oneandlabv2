import { useCallback } from 'react';
import type { Appointment } from '@oneandlab/shared-types';
import {
  useOfferQueueStore,
  type OpenIncomingOfferResult,
} from '@/features/appointments/store/offer-queue-store';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { offerPreviewFromListRow, type AppointmentListRow } from '@/utils/appointment-batch';

type OfferFailureReason = Extract<OpenIncomingOfferResult, { ok: false }>['reason'];

const OFFER_FAILURE_MESSAGES: Record<OfferFailureReason, { text: string; type: 'info' | 'error' } | null> = {
  invalid: null,
  already_accepted: { text: 'Ce rendez-vous a déjà été pris par un autre professionnel.', type: 'info' },
  unavailable: { text: 'Cette demande n’est plus disponible.', type: 'info' },
  not_found: { text: 'Cette demande n’existe plus.', type: 'info' },
  forbidden: { text: 'Cette demande ne vous est plus proposée.', type: 'info' },
  network: { text: 'Connexion instable, réessayez.', type: 'error' },
  error: { text: 'Impossible d’ouvrir la demande, réessayez.', type: 'error' },
};

/** Ouvre la modale d’offre ; si elle n’est plus disponible, prévient l’infirmier puis appelle `onUnavailable`. */
export function useOpenIncomingOffer(onUnavailable: () => void) {
  const userId = useAuthStore((s) => s.user?.id);
  const openIncomingOffer = useOfferQueueStore((s) => s.openIncomingOffer);
  const { show: toast } = useToast();

  return useCallback(
    (row: AppointmentListRow, apt: Appointment) => {
      if (!apt.id || !userId) return;
      void openIncomingOffer(apt.id, 'nurse', userId, offerPreviewFromListRow(row)).then((result) => {
        if (result.ok) return;
        const message = OFFER_FAILURE_MESSAGES[result.reason];
        if (message) toast(message.text, { type: message.type });
        onUnavailable();
      });
    },
    [onUnavailable, openIncomingOffer, toast, userId],
  );
}
