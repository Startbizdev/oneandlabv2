import { api } from '@/api/client';
import type { ApiResponse } from '@oneandlab/shared-api';

export type PatientBookingDraftResult = {
  draft_id: string;
};

export type PatientBookingDraftCompleteResult = {
  status: string;
  appointment_ids?: string[];
};

export async function createPatientBookingDraft(formData: FormData) {
  return api.postForm<PatientBookingDraftResult>('/patient/booking-draft', formData);
}

export async function completePatientBookingDraftIap(body: {
  draft_id: string;
  platform: 'ios' | 'android';
  transactionId?: string;
  signedTransaction?: string;
  productId?: string;
  purchaseToken?: string;
}) {
  return api.post<PatientBookingDraftCompleteResult>('/patient/booking-draft/iap-complete', body);
}

export async function fetchPatientBookingDraftStatus(params: { draft_id?: string; session_id?: string }) {
  const qs = new URLSearchParams();
  if (params.draft_id) qs.set('draft_id', params.draft_id);
  if (params.session_id) qs.set('session_id', params.session_id);
  return api.get<PatientBookingDraftCompleteResult & { error_message?: string }>(
    `/patient/booking-draft/status?${qs.toString()}`,
  );
}

export type { ApiResponse };
