import { api } from '@/api/client';
import type { Appointment } from '@oneandlab/shared-types';
import { buildMedicalDocumentForm } from '@/lib/uploads/upload-file';

export interface AppointmentHistoryEntry {
  id: string;
  action?: string;
  created_at?: string;
  user_name?: string;
  details?: string;
}

export interface MedicalDocumentRow {
  id: string;
  document_type: string;
  file_name?: string;
  created_at?: string;
}

export interface CarePhotoComment {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface CarePhotoRow {
  id: string;
  uploaded_by?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  created_at?: string;
  comments?: CarePhotoComment[];
}

export interface CarePhotosPayload {
  photos: CarePhotoRow[];
  can_upload: boolean;
  can_comment: boolean;
}

export interface ShareForNurseData {
  shareToken?: string;
  sharePath?: string;
  shareText?: string;
  shareTextAfterUrl?: string;
  repended?: boolean;
}

export async function fetchAppointmentHistory(id: string) {
  return api.get<AppointmentHistoryEntry[]>(`/appointments/${id}/history`);
}

export async function fetchMedicalDocuments(appointmentId: string) {
  return api.get<MedicalDocumentRow[]>(`/medical-documents?appointment_id=${appointmentId}`);
}

export async function fetchCarePhotos(appointmentId: string) {
  return api.get<CarePhotosPayload>(`/appointments/${appointmentId}/care-photos`);
}

export async function postCarePhotoComment(
  appointmentId: string,
  medicalDocumentId: string,
  body: string,
) {
  return api.post(`/appointments/${appointmentId}/care-photo-comments`, {
    medical_document_id: medicalDocumentId,
    body,
  });
}

/** Prépare le message de partage sans libérer le RDV (lecture seule). */
export async function fetchShareForNurse(appointmentId: string) {
  return api.get<ShareForNurseData>(`/appointments/${appointmentId}/share-for-nurse`);
}

/** Partage confrère : repasse le RDV en attente si assigné, puis retourne le lien / texte. */
export async function releaseAndFetchShareForNurse(appointmentId: string) {
  return api.post<ShareForNurseData>(`/appointments/${appointmentId}/share-for-nurse`, {});
}

/** Annulation patient (lot possible) — sans photo obligatoire. */
export async function cancelAppointmentsPatientBatch(
  appointmentIds: string[],
): Promise<{ ok: boolean; canceled: number; error?: string }> {
  let canceled = 0;
  let lastErr = '';
  for (const appointmentId of appointmentIds) {
    const res = await api.put<Appointment>(`/appointments/${appointmentId}`, {
      status: 'canceled',
      note: 'Annulé par le patient',
    });
    if (res.success) canceled += 1;
    else lastErr = res.error ?? lastErr;
  }
  if (canceled === 0) return { ok: false, canceled: 0, error: lastErr || 'Annulation impossible' };
  return { ok: true, canceled };
}

export async function uploadCarePhoto(
  appointmentId: string,
  file: string | { uri: string; fileName: string; mimeType: string },
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { buildMedicalDocumentForm, uploadFormData } = await import('@/lib/uploads/upload-file');
  const input =
    typeof file === 'string'
      ? { uri: file, fileName: 'care-photo.jpg', mimeType: 'image/jpeg' }
      : file;
  try {
    const fd = await buildMedicalDocumentForm(
      { uri: input.uri, fileName: input.fileName, mimeType: input.mimeType, fieldName: 'file' },
      {},
    );
    const res = await api.postForm<{ id?: string }>(
      `/appointments/${appointmentId}/care-photos`,
      fd,
    );
    if (res.success === false) {
      return { ok: false, error: res.error ?? res.message ?? 'Upload échoué' };
    }
    return { ok: true, id: res.data?.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Upload échoué',
    };
  }
}

export async function cancelAppointment(
  appointmentId: string,
  payload: {
    reason: string;
    comment: string;
    photoUri?: string;
    photoName?: string;
    photoMimeType?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  let photoDocId: string | null = null;

  if (payload.photoUri) {
    const fd = await buildMedicalDocumentForm(
      {
        uri: payload.photoUri,
        fileName: payload.photoName ?? 'cancellation.jpg',
        mimeType: payload.photoMimeType,
      },
      { appointment_id: appointmentId, document_type: 'cancellation_photo' },
    );
    try {
      const up = await api.postForm<{ id?: string }>('/medical-documents', fd);
      if (up.success && up.data?.id) photoDocId = up.data.id;
      else throw new Error(up.error ?? 'Upload échoué');
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : "Impossible d'envoyer la photo d'annulation.",
      };
    }
  }

  const body: Record<string, unknown> = {
    status: 'canceled',
    cancellation_reason: payload.reason,
    cancellation_comment: payload.comment,
  };
  if (photoDocId) body.cancellation_photo_document_id = photoDocId;

  const res = await api.put<Appointment>(`/appointments/${appointmentId}`, body);
  if (res.success) return { ok: true };
  return { ok: false, error: res.error ?? "Impossible d'annuler le rendez-vous" };
}
