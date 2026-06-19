import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import type { PatientAiChatMessage } from '../types/patient-ai-conversation';
import { isActiveAiDraft } from './is-active-ai-draft';

/** Dernier brouillon RDV actif dans le fil (ignore les confirmés / expirés). */
export function resolveLatestAiDraft(
  messages: PatientAiChatMessage[],
  fallback?: AiAppointmentDraft | null,
): AiAppointmentDraft | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const draft = messages[i]?.metadata?.draft;
    if (isActiveAiDraft(draft)) return draft;
  }
  return isActiveAiDraft(fallback) ? fallback : null;
}
