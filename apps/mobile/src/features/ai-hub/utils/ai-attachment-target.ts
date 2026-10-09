import type { MobileRole } from '@oneandlab/shared-constants';
import {
  isPatientProfileUploadType,
  type PatientProfileUploadType,
} from '@/features/patients/api/patient-profile.service';
import type { MedicalDocumentMeta } from '@/lib/uploads/upload-file';
import type { PatientAiConversation } from '../types/patient-ai-conversation';

/** Dossier auquel rattacher une pièce jointe ; jamais l'identifiant d'un soignant. */
export type AiAttachmentTarget =
  | { kind: 'own' }
  | { kind: 'appointment'; appointmentId: string }
  | { kind: 'patient'; patientId: string }
  | { kind: 'patient_required' }
  | { kind: 'appointment_required' };

type ConversationScope = Pick<PatientAiConversation, 'contextType' | 'contextId' | 'patientId'>;

/**
 * Patient : ses propres documents. Soignant : le rendez-vous de la conversation, sinon le patient
 * (pastille, conversation, paramètres de route). Préleveur : uniquement depuis un rendez-vous.
 */
export function resolveAiAttachmentTarget(
  role: MobileRole,
  conversation: ConversationScope | null,
  routePatientId?: string,
): AiAttachmentTarget {
  if (role === 'patient') return { kind: 'own' };
  if (conversation?.contextType === 'appointment' && conversation.contextId) {
    return { kind: 'appointment', appointmentId: conversation.contextId };
  }
  if (role === 'preleveur') return { kind: 'appointment_required' };
  const patientId =
    (conversation?.contextType === 'patient' ? conversation.contextId : null) ?? conversation?.patientId ?? routePatientId;
  return patientId ? { kind: 'patient', patientId } : { kind: 'patient_required' };
}

export type AiAttachmentUpload =
  | { kind: 'profile'; patientUserId: string; docType: PatientProfileUploadType }
  | { kind: 'medical'; meta: MedicalDocumentMeta }
  | { kind: 'unsupported'; message: string };

const OUTSIDE_APPOINTMENT_MESSAGE =
  "Sans rendez-vous, seuls l'ordonnance et les documents administratifs peuvent être joints. Ouvrez Cary depuis le rendez-vous du patient.";

/**
 * Envoi conforme au serveur : sans rendez-vous, un soignant ne peut déposer qu'une ordonnance
 * (`/medical-documents`) ou un document administratif (`/patient-documents/upload`).
 */
export function aiAttachmentUpload(
  target: Extract<AiAttachmentTarget, { kind: 'own' | 'appointment' | 'patient' }>,
  docType: string,
  userId: string,
): AiAttachmentUpload {
  switch (target.kind) {
    case 'own':
      return isPatientProfileUploadType(docType)
        ? { kind: 'profile', patientUserId: userId, docType }
        : { kind: 'medical', meta: { patient_id: userId, document_type: docType } };
    case 'appointment':
      return { kind: 'medical', meta: { appointment_id: target.appointmentId, document_type: docType } };
    case 'patient':
      if (isPatientProfileUploadType(docType)) return { kind: 'profile', patientUserId: target.patientId, docType };
      if (docType === 'ordonnance') {
        return { kind: 'medical', meta: { patient_id: target.patientId, document_type: docType } };
      }
      return { kind: 'unsupported', message: OUTSIDE_APPOINTMENT_MESSAGE };
  }
}
