<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <UButton to="/patient" variant="ghost" size="xl" class="mb-6">
      <UIcon name="i-lucide-arrow-left" class="mr-2" />
      Retour à mes rendez-vous
    </UButton>
    
    <div v-if="loading" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
      <p class="text-gray-500">Chargement du rendez-vous...</p>
    </div>
    
    <div v-else-if="error" class="mt-4">
      <UAlert color="red" :title="error" />
    </div>
    
    <div v-else-if="appointment" class="space-y-6">
      <!-- Informations principales -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">Détails du rendez-vous</h1>
            <Badge 
              v-if="appointment.status"
              :color="getStatusColor(appointment.status)"
              variant="subtle"
              size="lg"
            >
              {{ getStatusLabel(appointment.status) }}
            </Badge>
          </div>
        </template>
        
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500 mb-1">Type de rendez-vous</p>
            <p class="font-semibold">
              {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
            </p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500 mb-1">Date</p>
            <p class="font-semibold">{{ formatDate(appointment.scheduled_at) }}</p>
          </div>
          
          <div v-if="appointment.assigned_to_name">
            <p class="text-sm text-gray-500 mb-1">Professionnel assigné</p>
            <p class="font-semibold">{{ appointment.assigned_to_name }}</p>
          </div>
          
          <div v-if="appointment.duration_minutes">
            <p class="text-sm text-gray-500 mb-1">Durée</p>
            <p class="font-semibold">{{ appointment.duration_minutes }} minutes</p>
          </div>
          
          <div v-if="appointment.form_data?.duration_days">
            <p class="text-sm text-gray-500 mb-1">Durée des soins</p>
            <p class="font-semibold">{{ getDurationLabel(appointment.form_data.duration_days) }}</p>
          </div>
          
          <div v-if="appointment.form_data?.frequency">
            <p class="text-sm text-gray-500 mb-1">Fréquence</p>
            <p class="font-semibold">{{ getFrequencyLabel(appointment.form_data.frequency) }}</p>
          </div>
          
          <div class="md:col-span-2">
            <p class="text-sm text-gray-500 mb-1">Adresse</p>
            <p class="font-semibold">{{ appointment.address }}</p>
          </div>
          </div>
        </div>
      </UCard>
      
      <!-- Informations du patient -->
      <UCard v-if="appointment.form_data">
        <template #header>
          <h2 class="text-xl font-bold">Informations du patient</h2>
        </template>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="appointment.form_data.first_name">
            <p class="text-sm text-gray-500 mb-1">Prénom</p>
            <p class="font-semibold">{{ appointment.form_data.first_name }}</p>
          </div>
          
          <div v-if="appointment.form_data.last_name">
            <p class="text-sm text-gray-500 mb-1">Nom</p>
            <p class="font-semibold">{{ appointment.form_data.last_name }}</p>
          </div>
          
          <div v-if="appointment.form_data.phone">
            <p class="text-sm text-gray-500 mb-1">Téléphone</p>
            <p class="font-semibold">{{ appointment.form_data.phone }}</p>
          </div>
          
          <div v-if="appointment.form_data.email">
            <p class="text-sm text-gray-500 mb-1">Email</p>
            <p class="font-semibold">{{ appointment.form_data.email }}</p>
          </div>
          
          <div v-if="appointment.form_data.birth_date">
            <p class="text-sm text-gray-500 mb-1">Date de naissance</p>
            <p class="font-semibold">{{ formatDateOnly(appointment.form_data.birth_date) }}</p>
          </div>
          
          <div v-if="appointment.form_data.gender">
            <p class="text-sm text-gray-500 mb-1">Genre</p>
            <p class="font-semibold">{{ getGenderLabel(appointment.form_data.gender) }}</p>
          </div>
          
          <div v-if="appointment.form_data.category_name" class="md:col-span-2">
            <p class="text-sm text-gray-500 mb-1">Type de soin</p>
            <p class="font-semibold">{{ appointment.form_data.category_name }}</p>
          </div>
          
          <div v-if="appointment.form_data.availability" class="md:col-span-2">
            <p class="text-sm text-gray-500 mb-1">Disponibilités</p>
            <p class="font-semibold">{{ formatAvailability(appointment.form_data.availability) }}</p>
          </div>
          
          <div v-if="appointment.form_data.notes" class="md:col-span-2">
            <p class="text-sm text-gray-500 mb-1">Notes</p>
            <p class="font-semibold whitespace-pre-wrap">{{ appointment.form_data.notes }}</p>
          </div>
        </div>
      </UCard>
      
      <!-- Documents médicaux -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary-600" />
            <h2 class="text-xl font-bold">Documents médicaux</h2>
          </div>
        </template>
        
        <div v-if="loadingDocuments" class="text-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <p class="text-sm text-gray-500">Chargement des documents...</p>
        </div>
        
        <div v-else-if="medicalDocuments.length === 0" class="text-center py-8">
          <UIcon name="i-lucide-file-x" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p class="text-sm text-gray-500">Aucun document médical associé à ce rendez-vous</p>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UCard
            v-for="doc in medicalDocuments"
            :key="doc.id"
            class="hover:shadow-md transition-all duration-200 cursor-pointer group"
            :ui="{ 
              body: { padding: 'p-4' },
              ring: 'ring-1 ring-gray-200 dark:ring-gray-800',
              shadow: 'shadow-sm'
            }"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="flex-shrink-0 mt-0.5">
                  <div class="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                    <UIcon name="i-lucide-file" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {{ doc.file_name }}
                  </p>
                  <div class="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <UIcon name="i-lucide-hash" class="w-3.5 h-3.5" />
                    <span>{{ formatFileSize(doc.file_size) }}</span>
                    <span>•</span>
                    <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5" />
                    <span>{{ formatDateShort(doc.created_at) }}</span>
                  </div>
                  <div v-if="doc.document_type" class="mt-1">
                    <UBadge color="primary" variant="soft" size="xs">
                      {{ getDocumentTypeLabel(doc.document_type) }}
                    </UBadge>
                  </div>
                </div>
              </div>
              <UButton
                variant="ghost"
                color="primary"
                size="sm"
                icon="i-lucide-download"
                :loading="downloadingDoc === doc.id"
                @click.stop="downloadDocument(doc.id)"
                class="shrink-0"
              >
                <span class="hidden sm:inline">Télécharger</span>
              </UButton>
            </div>
          </UCard>
        </div>
      </UCard>
      
      <!-- Actions selon le statut -->
      <UCard v-if="appointment.status === 'pending'">
        <template #header>
          <h2 class="text-xl font-bold">Actions disponibles</h2>
        </template>
        
        <div class="space-y-2">
          <p class="text-gray-600">
            Votre rendez-vous est en attente de confirmation par un professionnel.
            Vous recevrez une notification dès qu'il sera confirmé.
          </p>
          <UButton
            color="error"
            variant="outline"
            size="xl"
            icon="i-lucide-x"
            @click="showCancelModal = true"
          >
            Annuler le rendez-vous
          </UButton>
        </div>
      </UCard>
      
      <UCard v-if="appointment.status === 'confirmed'">
        <template #header>
          <h2 class="text-xl font-bold">Rendez-vous confirmé</h2>
        </template>
        
        <div class="space-y-2">
          <UAlert color="green" title="Votre rendez-vous est confirmé !">
            Un professionnel a accepté votre demande. Vous recevrez un rappel 30 minutes avant le rendez-vous.
          </UAlert>
          <UButton
            color="error"
            variant="outline"
            size="xl"
            icon="i-lucide-x"
            @click="showCancelModal = true"
          >
            Annuler le rendez-vous
          </UButton>
        </div>
      </UCard>
      
      <!-- Modal de confirmation d'annulation -->
      <AlertModal
        v-model="showCancelModal"
        title="Confirmer l'annulation"
        message="Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est définitive et vous ne pourrez pas la modifier."
        confirm-label="Oui, annuler le rendez-vous"
        cancel-label="Retour"
        confirm-color="error"
        icon-type="error"
        :loading="canceling"
        @confirm="confirmCancelAppointment"
      >
        <template #content>
          <div v-if="appointment" class="mt-4 bg-gray-50 p-4 rounded-lg">
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-calendar" class="w-4 h-4 text-gray-500" />
                <span class="text-gray-600">{{ formatDate(appointment.scheduled_at) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-500" />
                <span class="text-gray-600">{{ appointment.address }}</span>
              </div>
            </div>
          </div>
        </template>
      </AlertModal>
      
      <!-- Invitation à noter après un RDV terminé -->
      <UCard v-if="appointment.status === 'completed' && !hasReviewed">
        <template #header>
          <h2 class="text-xl font-bold">Donnez votre avis</h2>
        </template>
        
        <UForm :state="reviewForm" @submit="submitReview" class="space-y-4">
          <UFormField label="Note (1-5 étoiles)" name="rating" required>
            <div class="flex space-x-2">
              <UButton
                v-for="star in 5"
                :key="star"
                :color="star <= reviewForm.rating ? 'yellow' : 'gray'"
                variant="ghost"
                size="xl"
                @click="reviewForm.rating = star"
              >
                <UIcon :name="star <= reviewForm.rating ? 'i-lucide-star' : 'i-lucide-star'" class="w-6 h-6" :class="star <= reviewForm.rating ? 'fill-current' : 'opacity-30'" />
              </UButton>
            </div>
          </UFormField>
          
          <UFormField label="Commentaire" name="comment">
            <UTextarea v-model="reviewForm.comment" rows="4" placeholder="Partagez votre expérience..." />
          </UFormField>
          
          <UButton type="submit" color="blue" size="xl" :loading="submittingReview">
            Envoyer l'avis
          </UButton>
        </UForm>
      </UCard>
      
      <UCard v-if="appointment.status === 'completed' && hasReviewed">
        <UAlert color="green" title="Merci pour votre avis !">
          Votre évaluation a été enregistrée.
        </UAlert>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

import { watch } from 'vue';
import { apiFetch } from '~/utils/api';

const route = useRoute();
const toast = useToast();

const appointment = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const hasReviewed = ref(false);
const submittingReview = ref(false);
const canceling = ref(false);
const showCancelModal = ref(false);
const medicalDocuments = ref<any[]>([]);
const downloadingDoc = ref<string | null>(null);
const loadingDocuments = ref(false);

const reviewForm = reactive({
  rating: 5,
  comment: '',
});

onMounted(async () => {
  await loadAppointment();
  await checkReview();
});

// Recharger les documents quand l'appointment est chargé
watch(() => appointment.value?.id, async (appointmentId) => {
  if (appointmentId) {
    await loadMedicalDocuments();
  }
}, { immediate: true });

const loadAppointment = async () => {
  loading.value = true;
  error.value = null;
  
  const response = await apiFetch(`/appointments/${route.params.id}`, {
    method: 'GET',
  });
  if (response.success && response.data) {
    appointment.value = response.data;
    // Charger les documents après avoir chargé l'appointment
    if (appointment.value?.id) {
      await loadMedicalDocuments();
    }
  } else {
    error.value = response.error || 'Erreur lors du chargement du rendez-vous';
  }
  
  loading.value = false;
};

const loadMedicalDocuments = async () => {
  if (!appointment.value) return;
  
  loadingDocuments.value = true;
  
  try {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'DD',
          location: 'patient/appointments/[id].vue:348',
          message: 'Loading medical documents',
          data: {
            appointmentId: appointment.value.id,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    
    const response = await apiFetch(`/medical-documents?appointment_id=${appointment.value.id}`, {
      method: 'GET',
    });
    
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'EE',
          location: 'patient/appointments/[id].vue:360',
          message: 'Medical documents response',
          data: {
            success: response.success,
            dataLength: response.data?.length || 0,
            data: response.data,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    
    if (response.success && response.data) {
      medicalDocuments.value = Array.isArray(response.data) ? response.data : [];
    } else {
      medicalDocuments.value = [];
    }
  } catch (error: any) {
    console.error('Erreur lors du chargement des documents médicaux:', error);
    medicalDocuments.value = [];
  } finally {
    loadingDocuments.value = false;
  }
};

const getDocumentTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'carte_vitale': 'Carte Vitale',
    'carte_mutuelle': 'Carte Mutuelle',
    'ordonnance': 'Ordonnance',
    'autres_assurances': 'Autres Assurances',
  };
  return labels[type] || type;
};

const checkReview = async () => {
  if (!appointment.value || appointment.value.status !== 'completed') return;
  
  const response = await apiFetch(`/reviews?appointment_id=${appointment.value.id}`, {
    method: 'GET',
  });
  
  if (response.success && response.data && response.data.length > 0) {
    hasReviewed.value = true;
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateShort = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const getStatusColor = (status: string | undefined | null) => {
  if (!status) return 'gray';
  const colors: Record<string, string> = {
    pending: 'amber',
    confirmed: 'blue',
    in_progress: 'violet',
    inProgress: 'violet', // Support des deux formats
    completed: 'green',
    cancelled: 'red',
    canceled: 'red',
    expired: 'gray',
    refused: 'red',
  };
  return colors[status] || 'gray';
};

const getStatusLabel = (status: string | undefined | null) => {
  if (!status) return 'Inconnu';
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    in_progress: 'En cours',
    inProgress: 'En cours', // Support des deux formats
    completed: 'Terminé',
    cancelled: 'Annulé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status] || status;
};

const getDurationLabel = (duration: string) => {
  const labels: Record<string, string> = {
    '1': '1 jour',
    '7': '7 jours',
    '10': '10 jours',
    '15': '15 jours (ou jusqu\'à la cicatrisation)',
    '30': '30 jours',
    '60+': 'Longue durée (60 jours ou +)',
  };
  return labels[duration] || duration;
};

const getFrequencyLabel = (frequency: string) => {
  const labels: Record<string, string> = {
    daily: 'Chaque jour',
    every_other_day: '1 jour sur 2',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
  };
  return labels[frequency] || frequency;
};

const formatDateOnly = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR');
};

const getGenderLabel = (gender: string) => {
  const labels: Record<string, string> = {
    male: 'Homme',
    female: 'Femme',
    other: 'Autre',
  };
  return labels[gender] || gender;
};

const formatAvailability = (availability: string) => {
  try {
    const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
    if (avail.type === 'all_day') {
      return 'Disponible toute la journée';
    } else if (avail.type === 'custom' && avail.range) {
      return `${avail.range[0]}h - ${avail.range[1]}h`;
    }
  } catch (e) {
    return availability;
  }
  return availability;
};

const submitReview = async () => {
  submittingReview.value = true;
  
  const response = await apiFetch('/reviews', {
    method: 'POST',
    body: {
      appointment_id: appointment.value.id,
      reviewee_id: appointment.value.assigned_to || appointment.value.assigned_nurse_id,
      reviewee_type: appointment.value.type === 'nursing' ? 'nurse' : 'subaccount',
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    },
  });
  
  if (response.success) {
    hasReviewed.value = true;
    toast.add({
      title: 'Avis envoyé',
      description: 'Merci pour votre retour !',
      color: 'green',
    });
  } else {
    toast.add({
      title: 'Erreur',
      description: response.error || 'Impossible d\'envoyer l\'avis',
      color: 'red',
    });
  }
  
  submittingReview.value = false;
};

const confirmCancelAppointment = async () => {
  canceling.value = true;
  
  const response = await apiFetch(`/appointments/${appointment.value.id}`, {
    method: 'PUT',
    body: { status: 'canceled', note: 'Annulé par le patient' },
  });
  
  if (response.success) {
    showCancelModal.value = false;
    toast.add({
      title: 'Rendez-vous annulé',
      description: 'Votre rendez-vous a été annulé avec succès',
      color: 'green',
    });
    await loadAppointment();
  } else {
    toast.add({
      title: 'Erreur',
      description: response.error || 'Impossible d\'annuler le rendez-vous',
      color: 'red',
    });
  }
  
  canceling.value = false;
};

const downloadDocument = async (docId: string) => {
  downloadingDoc.value = docId;
  
  try {
    // Trouver le document dans la liste pour obtenir son nom
    const doc = medicalDocuments.value.find(d => d.id === docId);
    const defaultFileName = doc?.file_name || 'document';
    
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || 'http://localhost:8888/api';
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(
      `${apiBase}/medical-documents/${docId}/download?id=${docId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors du téléchargement');
    }

    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'FFF',
          location: 'patient/appointments/[id].vue:655',
          message: 'Download response received',
          data: {
            docId,
            defaultFileName,
            contentType: response.headers.get('content-type'),
            contentDisposition: response.headers.get('content-disposition'),
            ok: response.ok,
            status: response.status,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    
    const blob = await response.blob();
    
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'GGG',
          location: 'patient/appointments/[id].vue:680',
          message: 'Blob created',
          data: {
            docId,
            blobSize: blob.size,
            blobType: blob.type,
            defaultFileName,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Récupérer le nom du fichier depuis les headers ou utiliser le nom du document
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = defaultFileName;
    if (contentDisposition) {
      // Essayer de parser le nom depuis Content-Disposition
      // Format: attachment; filename="nom-du-fichier.ext" ou attachment; filename=nom-du-fichier.ext
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      if (fileNameMatch && fileNameMatch[1]) {
        // Enlever les guillemets s'ils sont présents
        fileName = fileNameMatch[1].replace(/['"]/g, '');
      }
    }
    
    // Si toujours pas de nom, utiliser celui du document
    if (!fileName || fileName === 'document.pdf') {
      fileName = defaultFileName;
    }
    
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'HHH',
          location: 'patient/appointments/[id].vue:705',
          message: 'Downloading file',
          data: {
            docId,
            fileName,
            defaultFileName,
            contentDisposition,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.add({
      title: 'Téléchargement réussi',
      description: 'Le document a été téléchargé avec succès.',
      color: 'green',
    });
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Impossible de télécharger le document',
      color: 'red',
    });
  } finally {
    downloadingDoc.value = null;
  }
};
</script>

