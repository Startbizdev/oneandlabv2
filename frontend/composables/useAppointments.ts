/**
 * Composable pour la gestion des rendez-vous
 */

import { apiFetch } from '~/utils/api';
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
  
  const createAppointment = async (
    data: AppointmentCreatePayload,
    options?: { skipLoading?: boolean }
  ): Promise<{ success: boolean; data?: { id: string }; error?: string }> => {
    if (!options?.skipLoading) {
      loading.value = true;
    }
    error.value = null;
    
    try {
      // Extraire les fichiers du form_data
      const files = data.form_data?.files || {};
      const filesToUpload: Record<string, File> = {};
      
      // Séparer les fichiers réels des métadonnées
      if (data.files && typeof data.files === 'object') {
        Object.keys(data.files).forEach(key => {
          if (data.files[key] instanceof File) {
            filesToUpload[key] = data.files[key];
          }
        });
      }
      
      // Créer le rendez-vous sans les fichiers
      const appointmentData = { ...data };
      delete appointmentData.files;
      
      const response = await apiFetch('/appointments', {
        method: 'POST',
        body: appointmentData,
        timeout: 90000,
      });
      
      if (response.success && response.data?.id) {
        const appointmentId = response.data.id;
        
        // Gérer les documents du profil (avec medical_document_id)
        const profileDocumentsToLink: Array<{ fieldName: string; medicalDocumentId: string; documentType: string }> = [];
        Object.keys(files).forEach(key => {
          const fileData = files[key];
          if (fileData && typeof fileData === 'object' && !(fileData instanceof File)) {
            // C'est un document du profil avec medical_document_id
            if (fileData.medical_document_id && fileData.isNew === false) {
              profileDocumentsToLink.push({
                fieldName: key,
                medicalDocumentId: fileData.medical_document_id,
                documentType: fileData.field || key,
              });
            }
          }
        });
        
        // Attendre un peu pour s'assurer que le token est bien synchronisé
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Lier les documents du profil au nouveau rendez-vous
        for (const doc of profileDocumentsToLink) {
          try {
            await apiFetch('/medical-documents/copy', {
              method: 'POST',
              body: {
                source_medical_document_id: doc.medicalDocumentId,
                appointment_id: appointmentId,
                document_type: doc.documentType,
              },
            });
            
          } catch (err: any) {
            console.error(`Erreur lors de la liaison du document du profil ${doc.fieldName}:`, err);
            
          }
        }
        
        // Uploader les nouveaux fichiers si présents
        if (Object.keys(filesToUpload).length > 0) {
          
          await uploadMedicalDocuments(appointmentId, filesToUpload);
        }
        
        return { success: true, data: response.data };
      } else {
        error.value = response.error || 'Erreur lors de la création';
        return { success: false, error: error.value };
      }
    } catch (err: any) {
      error.value = err.message || 'Erreur réseau';
      return { success: false, error: error.value };
    } finally {
      if (!options?.skipLoading) {
        loading.value = false;
      }
    }
  };
  
  const uploadMedicalDocuments = async (appointmentId: string, files: Record<string, File>) => {
    // Vérifier si l'utilisateur est authentifié avant d'uploader
    // Vérifier à la fois le state et localStorage pour être sûr
    const { isAuthenticated } = useAuth();
    let hasAuth = isAuthenticated.value;
    
    // Si le state n'est pas synchronisé, vérifier directement localStorage
    if (!hasAuth && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      hasAuth = !!storedToken;
    }
    
    // Attendre un peu pour s'assurer que le token est bien synchronisé après vérification OTP
    if (hasAuth && typeof window !== 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Vérifier à nouveau après l'attente
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

    // Mapping des noms de champs vers les types de documents
    const fieldMapping: Record<string, string> = {
      'carte_vitale': 'carte_vitale',
      'carte_mutuelle': 'carte_mutuelle',
      'ordonnance': 'ordonnance',
      'autres_assurances': 'autres_assurances',
    };
    
    // Uploader chaque fichier
    // Le token CSRF est maintenant géré automatiquement par apiFetch
    // Le token d'authentification est aussi géré automatiquement par apiFetch depuis localStorage
    for (const [fieldName, file] of Object.entries(files)) {
      if (!file) continue;
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('appointment_id', appointmentId);
        // Ajouter le type de document pour permettre la sauvegarde dans le profil
        const documentType = fieldMapping[fieldName] || fieldName;
        formData.append('document_type', documentType);
        
        await apiFetch('/medical-documents', {
          method: 'POST',
          body: formData,
        });
      } catch (err: any) {
        console.error(`Erreur upload ${fieldName}:`, err);
        // Continuer avec les autres fichiers même en cas d'erreur
      }
    }
  };

  /**
   * Crée plusieurs rendez-vous (multi-soins). Chaque RDV reçoit les mêmes documents.
   * En cas d'échec partiel : les RDV déjà créés sont conservés, un message d'erreur est retourné.
   */
  const createMultipleAppointments = async (
    payloads: AppointmentCreatePayload[]
  ): Promise<{ success: boolean; createdIds: string[]; error?: string }> => {
    loading.value = true;
    error.value = null;
    const createdIds: string[] = [];

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
        if (sharedBatch) {
          payload.creation_batch_id = sharedBatch;
          payload.creation_batch_size = batchTotal;
          if (patientEmailFromPayloads && !(payload as { patient_email?: string }).patient_email) {
            (payload as { patient_email?: string }).patient_email = patientEmailFromPayloads;
          }
        }
        const result = await createAppointment(payload, { skipLoading: true });
        if (result.success && result.data?.id) {
          createdIds.push(result.data.id);
        } else {
          const msg = result.error || 'Erreur lors de la création';
          return {
            success: false,
            createdIds,
            error: createdIds.length > 0
              ? `${msg} (${createdIds.length}/${payloads.length} RDV créés)`
              : msg,
          };
        }
      }
      return { success: true, createdIds };
    } catch (err: any) {
      error.value = err.message || 'Erreur réseau';
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

