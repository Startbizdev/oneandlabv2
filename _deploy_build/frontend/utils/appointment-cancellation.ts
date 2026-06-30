import { apiFetch } from '~/utils/api';

export type CancelAppointmentPayload = {
  reason: string;
  comment: string;
  photoFile: File | null;
};

export type CancelAppointmentResult =
  | { ok: true }
  | { ok: false; error: string; photoUploadFailed?: boolean };

/** Rôles pouvant consulter la photo de preuve d’annulation sur la fiche RDV. */
export function canViewCancellationPhoto(role: string | null | undefined): boolean {
  if (!role) return false;
  return [
    'super_admin',
    'lab',
    'subaccount',
    'preleveur',
    'nurse',
    'pro',
    'patient',
  ].includes(role);
}

/**
 * Annule un RDV : upload optionnel de `cancellation_photo`, puis PUT status canceled.
 * Si l’upload échoue alors qu’un fichier est fourni, l’annulation n’est pas envoyée.
 */
export async function cancelAppointmentWithOptionalPhoto(
  appointmentId: string,
  payload: CancelAppointmentPayload,
): Promise<CancelAppointmentResult> {
  let photoDocId: string | null = null;

  if (payload.photoFile) {
    const formData = new FormData();
    formData.append('file', payload.photoFile);
    formData.append('appointment_id', appointmentId);
    formData.append('document_type', 'cancellation_photo');
    const uploadRes = await apiFetch<{ id?: string }>('/medical-documents', {
      method: 'POST',
      body: formData,
    });
    if (uploadRes.success && uploadRes.data?.id) {
      photoDocId = uploadRes.data.id;
    } else {
      return {
        ok: false,
        photoUploadFailed: true,
        error:
          uploadRes.error ||
          "Impossible d'envoyer la photo d'annulation. Vérifiez le fichier (image ou PDF, max 25 Mo) puis réessayez.",
      };
    }
  }

  const body: Record<string, unknown> = {
    status: 'canceled',
    cancellation_reason: payload.reason,
    cancellation_comment: payload.comment,
  };
  if (photoDocId) body.cancellation_photo_document_id = photoDocId;

  const response = await apiFetch(`/appointments/${appointmentId}`, { method: 'PUT', body });
  if (response.success) return { ok: true };
  return {
    ok: false,
    error: response.error || "Impossible d'annuler le rendez-vous",
  };
}
