import type { AiAppointmentDraft } from '@oneandlab/shared-types';

/** Brouillon RDV encore modifiable (pas confirmé / expiré). */
export function isActiveAiDraft(draft: AiAppointmentDraft | null | undefined): draft is AiAppointmentDraft {
  if (!draft?.id) return false;
  return draft.status === 'collecting' || draft.status === 'ready';
}
