/**
 * Composable pour la gestion des rendez-vous
 */

import { apiFetch } from '~/utils/api';
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

export const useAppointments = () => {
  const appointments = useState<Appointment[]>('appointments.list', () => []);
  const loading = useState<boolean>('appointments.loading', () => false);
  const error = useState<string | null>('appointments.error', () => null);
  const pagination = useState<AppointmentsPagination | null>('appointments.pagination', () => null);

  const fetchAppointments = async (filters?: AppointmentFilters) => {
    loading.value = true;
    error.value = null;

    try {
      const params: Record<string, string> = {};
      if (filters) {
        if (filters.status != null) params.status = String(filters.status);
        if (filters.type != null) params.type = String(filters.type);
        if (filters.page != null) params.page = String(filters.page);
        if (filters.limit != null) params.limit = String(filters.limit);
        if (filters.patient_id != null && filters.patient_id !== '') params.patient_id = String(filters.patient_id);
        if (filters.nurse_tab != null) params.nurse_tab = String(filters.nurse_tab);
      }
      const queryString = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
      const response = await apiFetch<{ success: boolean; data?: Appointment[]; pagination?: AppointmentsPagination; error?: string }>(`/appointments${queryString}`, {
        method: 'GET',
      });

      if (response.success && response.data) {
        appointments.value = response.data;
        if (response.pagination) {
          pagination.value = response.pagination;
        } else {
          pagination.value = null;
        }
      } else {
        error.value = response.error || 'Erreur lors du chargement';
      }
    } catch (err: any) {
      error.value = err.message || 'Erreur réseau';
    } finally {
      loading.value = false;
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
      console.warn('Utilisateur non authentifié, upload des documents médicaux ignoré');
      return;
    }

    const fieldMapping: Record<string, string> = {
      carte_vitale: 'carte_vitale',
      carte_mutuelle: 'carte_mutuelle',
      ordonnance: 'ordonnance',
      autres_assurances: 'autres_assurances',
    };

    for (const [fieldName, file] of Object.entries(files)) {
      if (!file) continue;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('appointment_id', appointmentId);
        const documentType = fieldMapping[fieldName] || fieldName;
        formData.append('document_type', documentType);

        await apiFetch('/medical-documents', {
          method: 'POST',
          body: formData,
          timeout: 180000,
        });
      } catch (err: any) {
        console.error(`Erreur upload ${fieldName}:`, err);
      }
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
      try {
        bookingDbg('createAppointment: copy medical-document', { field: doc.fieldName });
        await apiFetch('/medical-documents/copy', {
          method: 'POST',
          body: {
            source_medical_document_id: doc.medicalDocumentId,
            appointment_id: appointmentId,
            document_type: doc.documentType,
          },
          timeout: 120000,
        });
      } catch (err: any) {
        console.error(`Erreur lors de la liaison du document du profil ${doc.fieldName}:`, err);
      }
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
        return { success: false, error: error.value };
      }
    } catch (err: any) {
      error.value = err.message || 'Erreur réseau';
      bookingDbg('createAppointment: exception', { message: error.value });
      return { success: false, error: error.value };
    } finally {
      if (!options?.skipLoading) {
        loading.value = false;
      }
    }
  };

  /**
   * Crée plusieurs rendez-vous (y compris **un seul** : même pipeline que le panier multi).
   * Multi-RDV : POST séquentiels puis artefacts (copy profil + uploads) après tous les IDs connus.
   */
  const createMultipleAppointments = async (
    payloads: AppointmentCreatePayload[]
  ): Promise<{ success: boolean; createdIds: string[]; error?: string }> => {
    loading.value = true;
    error.value = null;
    const createdIds: string[] = [];
    const deferPostCreateArtifacts = payloads.length > 1;

    try {
      const types = new Set(payloads.map((p) => p.type));
      const sameTypeMulti =
        payloads.length > 1 &&
        types.size === 1 &&
        (types.has('nursing') || types.has('blood_test'));
      const firstBatch = payloads[0]?.creation_batch_id;
      const allShareExplicitBatch =
        sameTypeMulti &&
        !!firstBatch &&
        payloads.every((p) => p.creation_batch_id === firstBatch);
      const sharedBatch = allShareExplicitBatch
        ? firstBatch
        : sameTypeMulti
          ? (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
              ? globalThis.crypto.randomUUID()
              : undefined)
          : undefined;

      const batchTotal = payloads.length;
      const patientEmailFromPayloads = payloads.map((p) => (p as { patient_email?: string }).patient_email).find((e) => e && String(e).trim() !== '');

      for (let i = 0; i < payloads.length; i++) {
        const payload: AppointmentCreatePayload = { ...payloads[i] };
        bookingDbg('createMultipleAppointments: itération', {
          index: i + 1,
          total: payloads.length,
          type: payload.type,
        });
        if (sharedBatch) {
          payload.creation_batch_id = sharedBatch;
          payload.creation_batch_size = batchTotal;
          if (patientEmailFromPayloads && !(payload as { patient_email?: string }).patient_email) {
            (payload as { patient_email?: string }).patient_email = patientEmailFromPayloads;
          }
        }
        const result = await createAppointment(payload, {
          skipLoading: true,
          skipPostCreateArtifacts: deferPostCreateArtifacts,
        });
        if (result.success && result.data?.id) {
          createdIds.push(result.data.id);
          bookingDbg('createMultipleAppointments: itération OK', {
            index: i + 1,
            id: result.data.id,
          });
        } else {
          const msg = result.error || 'Erreur lors de la création';
          bookingDbg('createMultipleAppointments: arrêt sur erreur', {
            iteration: i + 1,
            total: payloads.length,
            error: msg,
          });
          if (deferPostCreateArtifacts && createdIds.length > 0) {
            bookingDbg('createMultipleAppointments: post-création partielle après erreur', {
              rdvs: createdIds.length,
            });
            for (let j = 0; j < createdIds.length; j++) {
              await runAppointmentPostCreateArtifacts(payloads[j], createdIds[j]);
            }
          }
          return {
            success: false,
            createdIds,
            error: createdIds.length > 0
              ? `${msg} (${createdIds.length}/${payloads.length} RDV créés)`
              : msg,
          };
        }
      }
      if (deferPostCreateArtifacts) {
        bookingDbg('createMultipleAppointments: post-création séquentielle (profils + fichiers)', {
          rdvs: createdIds.length,
        });
        for (let i = 0; i < payloads.length; i++) {
          bookingDbg('createMultipleAppointments: artefacts RDV', {
            index: i + 1,
            id: createdIds[i],
          });
          await runAppointmentPostCreateArtifacts(payloads[i], createdIds[i]);
        }
      }
      return { success: true, createdIds };
    } catch (err: any) {
      error.value = err.message || 'Erreur réseau';
      if (deferPostCreateArtifacts && createdIds.length > 0) {
        try {
          bookingDbg('createMultipleAppointments: post-création partielle après exception', {
            rdvs: createdIds.length,
          });
          for (let j = 0; j < createdIds.length; j++) {
            await runAppointmentPostCreateArtifacts(payloads[j], createdIds[j]);
          }
        } catch {
          /* ne pas masquer l’erreur d’origine */
        }
      }
      return {
        success: false,
        createdIds,
        error: createdIds.length > 0
          ? `${err.message} (${createdIds.length}/${payloads.length} RDV créés)`
          : err.message,
      };
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

