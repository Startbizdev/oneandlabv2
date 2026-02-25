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
  
  const createAppointment = async (data: AppointmentCreatePayload): Promise<{ success: boolean; data?: { id: string }; error?: string }> => {
    loading.value = true;
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
      loading.value = false;
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
  
  return {
    appointments,
    loading,
    error,
    pagination,
    fetchAppointments,
    createAppointment,
  };
};

