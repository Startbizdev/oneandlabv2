/**
 * Composable pour la gestion des rendez-vous
 */

import { apiFetch } from '~/utils/api';
import { ResumableAppointmentBatch } from '@oneandlab/shared-utils';
import { bookingDbg } from '~/utils/booking-celebration-debug';
import type { Appointment, AppointmentFilters, AppointmentCreatePayload } from '~/types/appointments';

export interface AppointmentsPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  /** True si une page suivante existe probablement (page pleine ou total > fenêtre affichée). */
  has_more?: boolean;
}

export const useAppointments = (scope = 'appointments') => {
  const appointments = useState<Appointment[]>(`${scope}.list`, () => []);
  const loading = useState<boolean>(`${scope}.loading`, () => false);
  const error = useState<string | null>(`${scope}.error`, () => null);
  const pagination = useState<AppointmentsPagination | null>(`${scope}.pagination`, () => null);

  const requestVersion = useState<number>(`${scope}.requestVersion`, () => 0);
  const fetchAppointments = async (filters: AppointmentFilters = {}, options: { allPages?: boolean; calendar?: boolean; progressive?: boolean } = {}) => {
    const version = ++requestVersion.value;
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      for (const key of ['status', 'type', 'page', 'limit', 'patient_id', 'nurse_tab', 'nurse_segment', 'patient_period', 'filter_assigned_to', 'date_from', 'date_to'] as const) {
        const value = filters[key];
        if (value != null && value !== '') params.set(key, String(value));
      }
      let page = options.allPages ? 1 : filters.page ?? 1;
      if (options.calendar) params.set('view', 'calendar');
      if (options.allPages) params.set('limit', options.calendar ? '250' : '50');
      const collected: Appointment[] = [];
      const ids = new Set<string>();
      let lastPagination: AppointmentsPagination | null = null;
      while (true) {
        params.set('page', String(page));
        const response = await apiFetch<{ success: boolean; data?: Appointment[]; pagination?: AppointmentsPagination; error?: string }>(`/appointments?${params}`, { method: 'GET' });
        if (version !== requestVersion.value) return;
        if (!response.success || !Array.isArray(response.data)) throw new Error(response.error || 'Erreur lors du chargement');
        lastPagination = response.pagination ?? null;
        const before = collected.length;
        for (const appointment of response.data) {
          if (!ids.has(appointment.id)) { ids.add(appointment.id); collected.push(appointment); }
        }
        if (options.progressive) appointments.value = [...collected];
        const hasMore = lastPagination?.has_more === true || Number(lastPagination?.pages || 0) > page;
        if (!options.allPages || !hasMore) break;
        // Fail explicitly instead of silently showing a partial calendar if the API repeats a page.
        if (collected.length === before) throw new Error('La liste complète des rendez-vous n’a pas pu être chargée. Réessayez.');
        page++;
      }
      appointments.value = collected;
      pagination.value = lastPagination;
    } catch (err) {
      if (version === requestVersion.value) error.value = err instanceof Error ? err.message : 'Erreur réseau';
    } finally {
      if (version === requestVersion.value) loading.value = false;
    }
  };

  const uploadMedicalDocuments = async (appointmentId: string, files: Record<string, File>) => {
    const { isAuthenticated } = useAuth();
    let hasAuth = isAuthenticated.value;

    if (!hasAuth && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      hasAuth = !!storedToken;
    }

    if (hasAuth && typeof window !== 'undefined') {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const { isAuthenticated: recheckAuth } = useAuth();
      if (!recheckAuth.value) {
        const storedToken = localStorage.getItem('auth_token');
        hasAuth = !!storedToken;
      }
    }

    if (!hasAuth) {
      throw new Error('Reconnectez-vous pour envoyer les documents du rendez-vous.');
    }

    const fieldMapping: Record<string, string> = {
      carte_vitale: 'carte_vitale',
      carte_mutuelle: 'carte_mutuelle',
      ordonnance: 'ordonnance',
      autres_assurances: 'autres_assurances',
    };

    for (const [fieldName, file] of Object.entries(files)) {
      if (!file) continue;

      await batchAttempt.completeOnce(`${appointmentId}:upload:${fieldName}`, async () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('appointment_id', appointmentId);
        const documentType = fieldMapping[fieldName] || fieldName;
        formData.append('document_type', documentType);

        const uploaded = await apiFetch('/medical-documents', {
          method: 'POST',
          body: formData,
          timeout: 180000,
        });
        if (!uploaded.success) throw new Error(uploaded.error || 'Envoi du document impossible');
      });
    }
  };

  /** Copie docs profil + uploads fichiers après création du RDV (peut être différée en multi-RDV). */
  const runAppointmentPostCreateArtifacts = async (
    data: AppointmentCreatePayload,
    appointmentId: string,
  ): Promise<void> => {
    const files = data.form_data?.files || {};
    const filesToUpload: Record<string, File> = {};

    if (data.files && typeof data.files === 'object') {
      Object.keys(data.files).forEach((key) => {
        if (data.files![key] instanceof File) {
          filesToUpload[key] = data.files![key];
        }
      });
    }

    const profileDocumentsToLink: Array<{ fieldName: string; medicalDocumentId: string; documentType: string }> =
      [];
    Object.keys(files).forEach((key) => {
      const fileData = files[key];
      if (fileData && typeof fileData === 'object' && !(fileData instanceof File)) {
        if ((fileData as { medical_document_id?: string }).medical_document_id && (fileData as { isNew?: boolean }).isNew === false) {
          profileDocumentsToLink.push({
            fieldName: key,
            medicalDocumentId: String((fileData as { medical_document_id: string }).medical_document_id),
            documentType: String((fileData as { field?: string }).field || key),
          });
        }
      }
    });

    bookingDbg('createAppointment: post-création (profils + uploads)', {
      appointmentId,
      profileDocs: profileDocumentsToLink.length,
      fichiers: Object.keys(filesToUpload).length,
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    for (const doc of profileDocumentsToLink) {
      await batchAttempt.completeOnce(`${appointmentId}:copy:${doc.fieldName}:${doc.medicalDocumentId}`, async () => {
        bookingDbg('createAppointment: copy medical-document', { field: doc.fieldName });
        const copied = await apiFetch('/medical-documents/copy', {
          method: 'POST',
          body: {
            source_medical_document_id: doc.medicalDocumentId,
            appointment_id: appointmentId,
            document_type: doc.documentType,
          },
          timeout: 120000,
        });
        if (!copied.success) throw new Error(copied.error || 'Copie du document impossible');
      });
    }

    if (Object.keys(filesToUpload).length > 0) {
      bookingDbg('createAppointment: upload fichiers médicaux', { count: Object.keys(filesToUpload).length });
      await uploadMedicalDocuments(appointmentId, filesToUpload);
    }
  };

  const createAppointment = async (
    data: AppointmentCreatePayload,
    options?: { skipLoading?: boolean; skipPostCreateArtifacts?: boolean },
  ): Promise<{ success: boolean; data?: { id: string }; error?: string }> => {
    if (!options?.skipLoading) {
      loading.value = true;
    }
    error.value = null;
    
    try {
      // Créer le rendez-vous sans les fichiers (copie profil + uploads : voir runAppointmentPostCreateArtifacts)
      const appointmentData = { ...data };
      delete appointmentData.files;

      bookingDbg('createAppointment: avant apiFetch POST', {
        type: (appointmentData as { type?: string }).type,
        creation_batch_id: (appointmentData as { creation_batch_id?: string }).creation_batch_id ?? null,
      });

      const response = await apiFetch('/appointments', {
        method: 'POST',
        body: appointmentData,
        timeout: 90000,
      });
      
      bookingDbg('createAppointment: après apiFetch', {
        success: Boolean(response?.success),
        id: response?.data?.id ?? null,
        error:
          response && typeof response === 'object' && response.success !== true
            ? String((response as { error?: string }).error ?? (response as { message?: string }).message ?? '')
            : '',
      });

      if (response.success && response.data?.id) {
        const appointmentId = response.data.id;
        if (!options?.skipPostCreateArtifacts) {
          await runAppointmentPostCreateArtifacts(data, appointmentId);
        }

        return { success: true, data: response.data };
      } else {
        error.value = response.error || 'Erreur lors de la création';
        bookingDbg('createAppointment: refus (sans exception)', {
          error: error.value,
          rawSuccess: response?.success,
          hasDataId: Boolean(response?.data?.id),
        });
        return { success: false, error: error.value || undefined };
      }
    } catch (err: any) {
      error.value = err.message || 'Erreur réseau';
      bookingDbg('createAppointment: exception', { message: error.value });
      return { success: false, error: error.value || undefined };
    } finally {
      if (!options?.skipLoading) {
        loading.value = false;
      }
    }
  };

  const batchAttempt = new ResumableAppointmentBatch<AppointmentCreatePayload>();
  const fileIdentities = new WeakMap<File, number>();
  let nextFileIdentity = 0;

  /** Retry only appointments not already acknowledged by the server in this mounted form. */
  const createMultipleAppointments = async (
    payloads: AppointmentCreatePayload[],
  ): Promise<{ success: boolean; createdIds: string[]; error?: string }> => {
    loading.value = true;
    error.value = null;
    try {
      const fingerprint = JSON.stringify(payloads, (key, value) => {
        if (key === 'creation_batch_id' || key === 'creation_batch_size') return undefined;
        if (typeof File !== 'undefined' && value instanceof File) {
          if (!fileIdentities.has(value)) fileIdentities.set(value, ++nextFileIdentity);
          return { fileIdentity: fileIdentities.get(value) };
        }
        return value;
      });
      const sameTypeMulti = payloads.length > 1 && payloads.every(p => p.type === payloads[0].type);
      const sharedBatch = sameTypeMulti
        ? payloads[0].creation_batch_id || globalThis.crypto?.randomUUID?.()
        : undefined;
      const patientEmail = payloads.find(p => p.patient_email)?.patient_email;
      const prepared = payloads.map(payload => ({
        ...payload,
        ...(sharedBatch ? {
          creation_batch_id: sharedBatch,
          creation_batch_size: payloads.length,
          patient_email: payload.patient_email || patientEmail,
        } : {}),
      }));
      const result = await batchAttempt.run(fingerprint, prepared, async (payload, requestId) => {
        const created = await createAppointment({ ...payload, client_request_id: requestId }, { skipLoading: true, skipPostCreateArtifacts: true });
        if (!created.success || !created.data?.id) throw new Error(created.error || 'Création impossible');
        return created.data.id;
      }, runAppointmentPostCreateArtifacts);
      if (!result.success) error.value = result.error || 'Création impossible';
      return result;
    } finally {
      loading.value = false;
    }
  };

  return {
    appointments,
    loading,
    error,
    pagination,
    fetchAppointments,
    createAppointment,
    createMultipleAppointments,
  };
};

