import { api } from '@/api/client';
import { buildMedicalDocumentForm, uploadFormData } from '@/lib/uploads/upload-file';

export interface ProPrescriptionRow {
  id: string;
  appointment_id: string | null;
  file_name: string;
  created_at: string;
  generated_at?: string | null;
  prescription_kind?: string | null;
  prescription_number?: string | null;
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

export type PrescriptionKind = 'medical' | 'nursing';

function prescriptionsPath(roleBase: 'pro' | 'nurse', page: number, limit: number, patientId?: string) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (patientId) q.set('patient_id', patientId);
  return `/${roleBase}/prescriptions?${q.toString()}`;
}

export async function fetchProPrescriptions(page = 1, limit = 20, patientId?: string) {
  return api.get<ProPrescriptionRow[]>(prescriptionsPath('pro', page, limit, patientId));
}

export async function fetchNursePrescriptions(page = 1, limit = 20, patientId?: string) {
  return api.get<ProPrescriptionRow[]>(prescriptionsPath('nurse', page, limit, patientId));
}

export async function generatePrescriptionPdf(
  appointmentId: string,
  prescriptionText: string,
  prescriptionKind: PrescriptionKind = 'medical',
) {
  return api.post<{
    pdf_base64: string;
    file_name?: string;
    prescription_number?: string;
    prescription_kind?: string;
    prescription_text?: string;
  }>(`/appointments/${appointmentId}/generate-prescription`, {
    prescription_text: prescriptionText.trim(),
    prescription_kind: prescriptionKind,
  });
}

export async function savePrescriptionPdfToAppointment(
  appointmentId: string,
  localPdfUri: string,
  options: {
    fileName?: string;
    prescriptionKind?: PrescriptionKind;
    prescriptionText?: string;
    prescriptionNumber?: string;
  } = {},
) {
  const fileName = options.fileName ?? 'ordonnance.pdf';
  const fd = await buildMedicalDocumentForm(
    { uri: localPdfUri, fileName, mimeType: 'application/pdf' },
    {
      appointment_id: appointmentId,
      document_type: 'ordonnance',
      prescription_kind: options.prescriptionKind,
      prescription_text: options.prescriptionText,
      prescription_number: options.prescriptionNumber,
    },
  );
  return api.postForm<{ id?: string }>('/medical-documents', fd);
}
