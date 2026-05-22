import { api } from '@/api/client';

export async function copyMedicalDocumentToAppointment(
  sourceMedicalDocumentId: string,
  appointmentId: string,
  documentType: string,
) {
  return api.post('/medical-documents/copy', {
    source_medical_document_id: sourceMedicalDocumentId,
    appointment_id: appointmentId,
    document_type: documentType,
  });
}

/** @deprecated Utiliser generatePrescriptionPdf depuis prescriptions.service */
export async function generateAppointmentPrescription(
  appointmentId: string,
  prescriptionText: string,
) {
  return api.post<{ pdf_base64: string; file_name?: string }>(
    `/appointments/${appointmentId}/generate-prescription`,
    { prescription_text: prescriptionText.trim() },
  );
}
