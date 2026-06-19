import type { AiAppointmentDraft } from '@oneandlab/shared-types';

/** Carte récap — statuts / étapes définis par le backend (pas de heuristique sur le texte). */
export function shouldShowAiDraftRecap(draft: AiAppointmentDraft): boolean {
  const payload = draft.payload ?? {};
  return (
    draft.status === 'confirmed' ||
    draft.status === 'ready' ||
    payload.booking_step === 'recap'
  );
}

export function canConfirmAiDraftRecap(draft: AiAppointmentDraft): boolean {
  return draft.status === 'ready';
}
