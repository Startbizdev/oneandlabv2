import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { getAiDraftDocumentEntries } from './ai-draft-documents';

/** Étape documents — ordonnance attendue mais pas encore jointe. */
export function shouldShowAiDraftDocumentUpload(draft: AiAppointmentDraft): boolean {
  if (draft.status === 'confirmed') return false;
  const payload = draft.payload ?? {};
  const step = String(payload.booking_step ?? '');
  if (step !== 'documents') return false;

  const status = String(payload.ordonnance_status ?? 'pending');
  if (status !== 'pending') return false;

  return !draftHasOrdonnanceFile(draft);
}

export function draftPendingUploadType(draft: AiAppointmentDraft | null): string {
  if (!draft) return 'ordonnance';
  const pending = draft.payload?.pending_upload_type;
  if (typeof pending === 'string' && pending.trim()) return pending.trim();
  return 'ordonnance';
}

function draftHasOrdonnanceFile(draft: AiAppointmentDraft): boolean {
  return getAiDraftDocumentEntries(draft).some((e) => e.type === 'ordonnance');
}
