import type { MedicalDocumentRow } from '@/features/appointments/detail/api/appointment-detail.service';
import {
  PATIENT_PROFILE_UPLOAD_TYPES,
  type PatientDocumentRow,
} from '@/features/patients/api/patient-profile.service';

const PROFILE_DOC_TYPES = new Set<string>(PATIENT_PROFILE_UPLOAD_TYPES);

function docTimestamp(value?: string): number {
  if (!value?.trim()) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function profileRowToMedicalDoc(row: PatientDocumentRow): MedicalDocumentRow {
  const docType = row.document_type?.trim() ?? '';
  const medicalId = row.medical_document_id ?? row.id;
  return {
    id: medicalId,
    document_type: docType,
    file_name: row.file_name,
    created_at: row.created_at,
    source: 'patient_profile',
  };
}

/** Fusionne les docs profil dans la liste RDV (aligné backend GET /medical-documents). */
export function mergeProfileDocumentsIntoAppointmentDocs(
  appointmentDocs: MedicalDocumentRow[],
  profileRows: PatientDocumentRow[],
): MedicalDocumentRow[] {
  const merged = [...appointmentDocs];
  const appointmentDocIds = new Set(appointmentDocs.map((d) => d.id));

  for (const row of profileRows) {
    const docType = row.document_type?.trim();
    const medicalId = row.medical_document_id ?? row.id;
    if (!docType || !medicalId || docType === 'care_photo') continue;
    if (!PROFILE_DOC_TYPES.has(docType)) continue;
    if (row.source === 'appointment') continue;
    if (appointmentDocIds.has(medicalId)) continue;

    const existingIdx = merged.findIndex((d) => d.document_type === docType);
    if (existingIdx >= 0) {
      const existing = merged[existingIdx];
      const profileCreated = docTimestamp(row.created_at);
      const aptCreated = docTimestamp(existing.created_at);
      if (profileCreated > aptCreated) {
        merged.splice(existingIdx, 1);
        merged.push({
          ...profileRowToMedicalDoc(row),
          profile_newer_than_appointment: true,
        });
      }
      continue;
    }

    merged.push(profileRowToMedicalDoc(row));
  }

  return merged;
}
