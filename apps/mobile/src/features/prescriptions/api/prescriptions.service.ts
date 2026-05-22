import { api } from '@/api/client';
import { buildMedicalDocumentForm, uploadFormData } from '@/lib/uploads/upload-file';

export interface ProPrescriptionRow {
  id: string;
  appointment_id: string | null;
  file_name: string;
  created_at: string;
  appointment_scheduled_at?: string | null;
  appointment_status?: string | null;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
}

export type PrescriptionsPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export async function fetchProPrescriptions(page = 1, limit = 20) {
  return api.get<ProPrescriptionRow[]>(
    `/pro/prescriptions?page=${page}&limit=${limit}`,
  );
}

export async function generatePrescriptionPdf(
  appointmentId: string,
  prescriptionText: string,
) {
  return api.post<{ pdf_base64: string; file_name?: string }>(
    `/appointments/${appointmentId}/generate-prescription`,
    { prescription_text: prescriptionText.trim() },
  );
}

export async function savePrescriptionPdfToAppointment(
  appointmentId: string,
  localPdfUri: string,
  fileName = 'ordonnance.pdf',
) {
  const fd = await buildMedicalDocumentForm(
    { uri: localPdfUri, fileName, mimeType: 'application/pdf' },
    { appointment_id: appointmentId, document_type: 'ordonnance' },
  );
  return api.postForm<{ id?: string }>('/medical-documents', fd);
}
