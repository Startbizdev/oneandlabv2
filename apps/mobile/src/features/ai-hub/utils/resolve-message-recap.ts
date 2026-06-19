import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import type { PatientAiChatMessage } from '../types/patient-ai-conversation';
import { canConfirmAiDraftRecap, shouldShowAiDraftRecap } from './should-show-ai-draft-recap';

export type MessageRecapState = {
  draft: AiAppointmentDraft;
  canConfirm: boolean;
};

/** Récap = brouillon stocké sur le message assistant (metadata.draft). */
export function resolveMessageRecap(message: PatientAiChatMessage): MessageRecapState | null {
  const draft = message.metadata?.draft;
  if (!draft?.id || !shouldShowAiDraftRecap(draft)) return null;
  return { draft, canConfirm: canConfirmAiDraftRecap(draft) };
}

/** Met à jour le brouillon d'un message après confirmation API. */
export function patchMessageDraft(
  messages: PatientAiChatMessage[],
  draftId: string,
  draft: AiAppointmentDraft,
): PatientAiChatMessage[] {
  return messages.map((m) => {
    if (m.metadata?.draft?.id !== draftId) return m;
    return { ...m, metadata: { ...m.metadata, draft } };
  });
}
