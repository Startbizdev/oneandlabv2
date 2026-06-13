import { api } from '@/api/client';
import { buildMedicalDocumentForm } from '@/lib/uploads/upload-file';

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
  appointment_type?: string | null;
  appointment_category_name?: string | null;
  appointment_creation_batch_id?: string | null;
  appointment_batch_count?: number | null;
  appointment_availability?: unknown;
  appointment_care_items?: Array<Record<string, unknown>> | null;
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
export type PrescriptionLinkMode = 'standalone' | 'appointment';

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

export async function generatePrescriptionPdf(options: {
  patientId: string;
  prescriptionText: string;
  prescriptionKind?: PrescriptionKind;
  appointmentId?: string | null;
}) {
  const body: Record<string, string> = {
    patient_id: options.patientId,
    prescription_text: options.prescriptionText.trim(),
    prescription_kind: options.prescriptionKind ?? 'medical',
  };
  if (options.appointmentId) {
    body.appointment_id = options.appointmentId;
  }
  return api.post<{
    pdf_base64: string;
    file_name?: string;
    prescription_number?: string;
    prescription_kind?: string;
    prescription_text?: string;
  }>('/prescriptions/generate', body);
}

/** @deprecated Préférer generatePrescriptionPdf avec patientId */
export async function generatePrescriptionPdfForAppointment(
  appointmentId: string,
  prescriptionText: string,
  prescriptionKind: PrescriptionKind = 'medical',
  patientId?: string,
) {
  if (patientId) {
    return generatePrescriptionPdf({
      patientId,
      prescriptionText,
      prescriptionKind,
      appointmentId,
    });
  }
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

export async function savePrescriptionPdf(
  localPdfUri: string,
  options: {
    patientId: string;
    appointmentId?: string | null;
    fileName?: string;
    prescriptionKind?: PrescriptionKind;
    prescriptionText?: string;
    prescriptionNumber?: string;
  },
) {
  const fileName = options.fileName ?? 'ordonnance.pdf';
  const meta: Parameters<typeof buildMedicalDocumentForm>[1] = {
    document_type: 'ordonnance',
    patient_id: options.patientId,
    prescription_kind: options.prescriptionKind,
    prescription_text: options.prescriptionText,
    prescription_number: options.prescriptionNumber,
  };
  if (options.appointmentId) {
    meta.appointment_id = options.appointmentId;
  }
  const fd = await buildMedicalDocumentForm(
    { uri: localPdfUri, fileName, mimeType: 'application/pdf' },
    meta,
  );
  return api.postForm<{ id?: string }>('/medical-documents', fd);
}

/** @deprecated Préférer savePrescriptionPdf */
export async function savePrescriptionPdfToAppointment(
  appointmentId: string,
  localPdfUri: string,
  options: {
    patientId: string;
    fileName?: string;
    prescriptionKind?: PrescriptionKind;
    prescriptionText?: string;
    prescriptionNumber?: string;
  },
) {
  return savePrescriptionPdf(localPdfUri, { ...options, appointmentId });
}
