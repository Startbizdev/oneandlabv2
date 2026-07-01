import {
  cacheMedicalDocument,
  getCachedMedicalDocumentUri,
} from '@/lib/downloads/download-medical-document';
import type { PatientAiChatAttachment, PatientAiChatMessage } from '../types/patient-ai-conversation';

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

/** Normalise metadata API (snake_case ou camelCase) vers le type mobile. */
export function normalizeMessageAttachment(raw: unknown): PatientAiChatAttachment | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const medicalDocumentId = readString(o, 'medicalDocumentId', 'medical_document_id');
  const fileName = readString(o, 'fileName', 'file_name') || 'document';
  const mimeType = readString(o, 'mimeType', 'mime_type') || 'application/octet-stream';
  const documentType = readString(o, 'documentType', 'document_type') || undefined;
  const uri = readString(o, 'uri');
  if (!medicalDocumentId && !uri) return undefined;

  return {
    uri,
    fileName,
    mimeType,
    ...(medicalDocumentId ? { medicalDocumentId } : {}),
    ...(documentType ? { documentType } : {}),
  };
}

async function resolveAttachmentUri(
  attachment: PatientAiChatAttachment,
): Promise<PatientAiChatAttachment> {
  if (!attachment.medicalDocumentId) {
    return attachment;
  }

  const cached = await getCachedMedicalDocumentUri(attachment.medicalDocumentId, attachment.fileName);
  if (cached) {
    return { ...attachment, uri: cached };
  }

  const downloaded = await cacheMedicalDocument(attachment.medicalDocumentId, attachment.fileName);
  if (downloaded.ok && downloaded.localUri) {
    return { ...attachment, uri: downloaded.localUri };
  }

  return attachment;
}

/** Recharge les URI locales des pièces jointes après fetch API ou redémarrage app. */
export async function hydrateMessageAttachments(
  messages: PatientAiChatMessage[],
): Promise<PatientAiChatMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      const normalized = normalizeMessageAttachment(message.metadata?.attachment);
      if (!normalized) return message;

      const attachment = await resolveAttachmentUri(normalized);
      return {
        ...message,
        metadata: {
          ...message.metadata,
          attachment,
        },
      };
    }),
  );
}
