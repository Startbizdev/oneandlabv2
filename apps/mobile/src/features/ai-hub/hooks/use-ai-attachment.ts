import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useCallback, useState } from 'react';
import { uploadPatientProfileDocument } from '@/features/patients/api/patient-profile.service';
import { carePhotoPickErrorMessage, pickCarePhoto, pickCarePhotoFromSource } from '@/lib/uploads/pick-care-photo';
import type { CarePhotoPickSource } from '@/lib/uploads/pick-care-photo';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';
import { analyzeMedicalDocument, attachDocumentToAiDraft } from '../api/ai.service';
import type { PatientAiChatAttachment } from '../types/patient-ai-conversation';
import { inferAttachmentDocType } from '../utils/ai-attachment-message';
import { aiAttachmentUpload, type AiAttachmentTarget } from '../utils/ai-attachment-target';

type Params = {
  userId: string;
  target: AiAttachmentTarget;
  activeDraft: AiAppointmentDraft | null;
  setActiveDraft: (draft: AiAppointmentDraft) => void;
  busy: boolean;
  showToast: (title: string, opts?: { type?: 'success' | 'error' | 'info' }) => void;
};

/** Pièce jointe refusée faute de patient choisi : l'écran ouvre le choix du patient. */
export type AiAttachOutcome = 'patient_required' | undefined;

/** Pièce jointe du compositeur : choix, envoi du fichier, rattachement au brouillon, pré-analyse. */
export function useAiAttachment({ userId, target, activeDraft, setActiveDraft, busy, showToast }: Params) {
  const [pendingAttachment, setPendingAttachment] = useState<PatientAiChatAttachment | null>(null);
  const [attaching, setAttaching] = useState(false);

  const handleAttach = useCallback(
    async (docTypeOverride?: string, pickSource?: CarePhotoPickSource): Promise<AiAttachOutcome> => {
      if (attaching || busy) return undefined;
      if (!userId) {
        showToast('Session expirée. Reconnectez-vous.', { type: 'error' });
        return undefined;
      }
      if (target.kind === 'patient_required') {
        showToast("Choisissez d'abord le patient concerné par ce document.", { type: 'info' });
        return 'patient_required';
      }
      if (target.kind === 'appointment_required') {
        showToast('Joignez ce document depuis le rendez-vous concerné.', { type: 'info' });
        return undefined;
      }
      try {
        const picked = pickSource ? await pickCarePhotoFromSource(pickSource) : await pickCarePhoto();
        if (!picked) return undefined;
        const docType = inferAttachmentDocType(activeDraft, docTypeOverride ?? null, picked.fileName);
        const upload = aiAttachmentUpload(target, docType, userId);
        if (upload.kind === 'unsupported') {
          showToast(upload.message, { type: 'error' });
          return undefined;
        }
        setPendingAttachment({ uri: picked.uri, fileName: picked.fileName, mimeType: picked.mimeType, documentType: docType });
        setAttaching(true);

        const uploaded =
          upload.kind === 'profile'
            ? await uploadPatientProfileDocument(upload.patientUserId, upload.docType, picked)
            : await uploadMedicalDocument({ uri: picked.uri, fileName: picked.fileName, mimeType: picked.mimeType }, upload.meta);
        if (!uploaded?.id) throw new Error('Envoi du document impossible');
        const fileName = uploaded.file_name ?? picked.fileName;

        if (activeDraft?.id) {
          setActiveDraft(await attachDocumentToAiDraft(activeDraft.id, docType, uploaded.id, fileName));
        }
        setPendingAttachment({
          uri: picked.uri,
          fileName,
          mimeType: picked.mimeType,
          medicalDocumentId: uploaded.id,
          documentType: docType,
        });
        void analyzeMedicalDocument(uploaded.id).catch((e: unknown) => {
          console.warn('[cary-ai] pré-analyse du document indisponible (analysée à l’envoi)', e);
        });
      } catch (e) {
        setPendingAttachment(null);
        showToast(carePhotoPickErrorMessage(e), { type: 'error' });
      } finally {
        setAttaching(false);
      }
      return undefined;
    },
    [activeDraft, attaching, busy, setActiveDraft, showToast, target, userId],
  );

  const clearAttachment = useCallback(() => setPendingAttachment(null), []);

  return { pendingAttachment, setPendingAttachment, attaching, handleAttach, clearAttachment };
}
