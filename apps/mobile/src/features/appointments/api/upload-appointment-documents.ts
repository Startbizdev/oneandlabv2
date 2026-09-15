import type { ResumableAppointmentBatch } from '@oneandlab/shared-utils';
import type { AppointmentCreatePayload } from './create-multiple-appointments';
import { copyMedicalDocumentToAppointment } from './medical-documents.service';
import { buildMedicalDocumentForm, uploadFormData } from '@/lib/uploads/upload-file';

export type LocalFileRef = { uri: string; name: string; mimeType?: string };

type ProfileDocRef = {
  medical_document_id: string;
  isNew?: boolean;
  field?: string;
};

function isProfileDocRef(v: unknown): v is ProfileDocRef {
  return (
    typeof v === 'object' &&
    v !== null &&
    'medical_document_id' in v &&
    typeof (v as ProfileDocRef).medical_document_id === 'string' &&
    (v as ProfileDocRef).isNew === false
  );
}

const FIELD_MAP: Record<string, string> = {
  carte_vitale: 'carte_vitale',
  carte_mutuelle: 'carte_mutuelle',
  ordonnance: 'ordonnance',
  autres_assurances: 'autres_assurances',
};

export async function uploadAppointmentDocuments(
  appointmentId: string,
  payload: AppointmentCreatePayload,
  attempt?: ResumableAppointmentBatch<AppointmentCreatePayload>,
): Promise<void> {
  const files = { ...payload.form_data?.files, ...payload.files } as
    | Record<string, LocalFileRef | ProfileDocRef | undefined>
    | undefined;
  if (!files) return;

  const profileDocs: { fieldName: string; medicalDocumentId: string; documentType: string }[] = [];
  const uploads: { fieldName: string; file: LocalFileRef }[] = [];

  for (const [fieldName, entry] of Object.entries(files)) {
    if (!entry) continue;
    if (isProfileDocRef(entry)) {
      profileDocs.push({
        fieldName,
        medicalDocumentId: entry.medical_document_id,
        documentType: entry.field ?? FIELD_MAP[fieldName] ?? fieldName,
      });
      continue;
    }
    if ('uri' in entry && entry.uri) {
      uploads.push({ fieldName, file: entry });
    }
  }

  await new Promise((r) => setTimeout(r, 300));

  const once = (key: string, operation: () => Promise<void>) => attempt ? attempt.completeOnce(key, operation) : operation();
  for (const doc of profileDocs) {
    await once(`${appointmentId}:copy:${doc.fieldName}:${doc.medicalDocumentId}`, async () => {
      const result = await copyMedicalDocumentToAppointment(
        doc.medicalDocumentId,
        appointmentId,
        doc.documentType,
      );
      if (!result.success) throw new Error(result.error || 'Copie du document impossible');
    });
  }

  for (const { fieldName, file } of uploads) {
    const docType = FIELD_MAP[fieldName] ?? fieldName;
    const fd = await buildMedicalDocumentForm(
      { uri: file.uri, fileName: file.name, mimeType: file.mimeType },
      { appointment_id: appointmentId, document_type: docType },
    );
    await once(`${appointmentId}:upload:${fieldName}:${file.uri}`, () => uploadFormData('/medical-documents', fd));
  }
}
