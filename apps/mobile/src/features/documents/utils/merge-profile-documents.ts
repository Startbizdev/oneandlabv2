import type { MedicalDocumentRow } from '@/features/appointments/detail/api/appointment-detail.service';
import {
  PATIENT_PROFILE_UPLOAD_TYPES,
  type PatientDocumentRow,
} from '@/features/patients/api/patient-profile.service';

const PROFILE_DOC_TYPES = new Set<string>(PATIENT_PROFILE_UPLOAD_TYPES);

/** Fusionne les docs profil dans la liste RDV (aligné backend GET /medical-documents). */
export function mergeProfileDocumentsIntoAppointmentDocs(
  appointmentDocs: MedicalDocumentRow[],
  profileRows: PatientDocumentRow[],
): MedicalDocumentRow[] {
  const merged = [...appointmentDocs];
  const appointmentDocIds = new Set(appointmentDocs.map((d) => d.id));
  const typesOnAppointment = new Set(
    appointmentDocs.map((d) => d.document_type).filter(Boolean),
  );

  for (const row of profileRows) {
    const docType = row.document_type?.trim();
    const medicalId = row.medical_document_id ?? row.id;
    if (!docType || !medicalId || docType === 'care_photo') continue;
    if (!PROFILE_DOC_TYPES.has(docType)) continue;
    if (row.source === 'appointment') continue;
    if (appointmentDocIds.has(medicalId)) continue;
    if (typesOnAppointment.has(docType)) continue;

    merged.push({
      id: medicalId,
      document_type: docType,
      file_name: row.file_name,
      created_at: row.created_at,
    });
    typesOnAppointment.add(docType);
  }

  return merged;
}
