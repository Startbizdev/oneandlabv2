<template>
  <AppointmentDetailPage ref="detailRef" base-path="/admin" @appointment-loaded="onAppointmentLoaded">
    <template #sidebarActions="{ appointment, loadAppointment }">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Changer le statut</label>
          <AppointmentStatusSelect
            :model-value="appointment.status === 'cancelled' ? 'canceled' : appointment.status"
            :appointment-id="String(appointment.id)"
            require-cancel-form
            @update:model-value="(v) => (appointment.status = v)"
            @updated="() => { loadAppointment(); loadStatusHistory(); }"
          />
        </div>
        <NurseRdvSharePanel
          v-if="appointment.type === 'nursing' && !appointmentCanceledOrCompleted(appointment.status)"
          :appointment-id="String(appointment.id)"
          @released="() => loadAppointment()"
        />
        <UAlert
          v-else-if="appointment.type === 'nursing' && isAppointmentCanceledStatus(appointment.status)"
          color="neutral"
          variant="subtle"
          icon="i-lucide-share-2"
          title="Partage indisponible"
          description="Le bouton « Partager » (WhatsApp, lien) sert à proposer un soin encore actif à un confrère. Pour un rendez-vous annulé, le partage n’est plus proposé."
          class="rounded-xl text-left"
        />
        <div class="space-y-2">
          <div class="flex flex-col sm:flex-row gap-2">
            <UButton
              v-if="appointment.status !== 'canceled'"
              type="button"
              color="error"
              variant="outline"
              size="md"
              leading-icon="i-lucide-x-circle"
              :loading="updatingStatus"
              :on-click="() => openCancelModal(appointment, loadAppointment)"
            >
              Annuler le rendez-vous
            </UButton>
            <UButton
              v-if="appointment.status === 'canceled'"
              type="button"
              color="success"
              variant="solid"
              size="md"
              leading-icon="i-lucide-rotate-ccw"
              :loading="updatingStatus"
              :on-click="() => restoreAppointment(appointment, loadAppointment)"
            >
              Restaurer le rendez-vous
            </UButton>
          </div>
        </div>
      </div>
    </template>

    <template #documentsCard="{ appointment, documents, documentsLoading, loadDocuments }">
      <AppointmentDocumentsSection
        :documents="documents || []"
        :loading="documentsLoading"
        empty-description="Aucun document médical pour ce rendez-vous."
        :show-upload-area="!!appointment && canUploadMedicalDocumentsForAppointmentStatus(appointment.status)"
        :upload-types="uploadDocumentTypes"
        :can-replace="!!appointment && canUploadMedicalDocumentsForAppointmentStatus(appointment.status)"
        :downloading-ids="downloadingDocuments"
        :uploading-types="uploadingTypes"
        @download="downloadDocument"
        @upload="(docType, file) => { setAppointmentForUpload(appointment); uploadDocumentFile(file, docType); }"
      />
    </template>

    <template #assignationSection="{ appointment, loadAppointment }">
      <AdminAppointmentAssignmentCard
        :appointment="appointment"
        :load-appointment="loadAppointment"
        :batch-count="assignBatchCount(appointment)"
      />
    </template>

    <template #mainExtra="{ appointment, loadAppointment }">
      <AdminLabBrandChoiceBanner :appointment="appointment" class="mb-4" />
      <UCard v-if="statusHistory.length > 0" class="mt-6">
        <template #header>
          <h2 class="text-xl font-normal">Historique des statuts</h2>
        </template>
        <div class="space-y-2">
          <div
            v-for="update in statusHistory"
            :key="update.id"
            class="flex justify-between items-center p-2 border rounded border-gray-200 dark:border-gray-700"
          >
            <div>
              <UBadge :color="getStatusColor(update.status)" class="mr-2" size="sm">
                {{ getStatusLabel(update.status) }}
              </UBadge>
              <span class="text-sm text-gray-600 dark:text-gray-400">
                par {{ update.actor_role }} le {{ formatDate(update.created_at) }}
              </span>
            </div>
            <div v-if="update.note" class="text-sm text-gray-500 dark:text-gray-400">
              {{ update.note }}
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </AppointmentDetailPage>

  <CancelAppointmentModal
    v-model:open="showCancelModal"
    :loading="updatingStatus"
    @confirm="onConfirmCancel"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

import { apiFetch } from '~/utils/api';
import { cancelAppointmentWithOptionalPhoto } from '~/utils/appointment-cancellation';
import { getAppointmentFromDetailRef } from '~/composables/useAppointmentDetailRef';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';
import { canUploadMedicalDocumentsForAppointmentStatus } from '~/utils/appointment-documents-upload';

const route = useRoute();
const detailRef = ref<{ loadAppointment: () => Promise<void>; loadDocuments: () => Promise<void>; appointment: { value: any } } | null>(null);
const toast = useAppToast();

function isAppointmentCanceledStatus(status: unknown) {
  const s = String(status ?? '').toLowerCase();
  return s === 'canceled' || s === 'cancelled';
}

function appointmentCanceledOrCompleted(status: unknown) {
  const s = String(status ?? '').toLowerCase();
  return s === 'completed' || s === 'canceled' || s === 'cancelled';
}

const statusHistory = ref<any[]>([]);
const showCancelModal = ref(false);
const currentAppointmentForCancel = ref<any>(null);
const currentLoadAppointmentForCancel = ref<(() => Promise<void>) | null>(null);
const currentAppointmentForUpload = ref<any>(null);
const downloadingDocuments = ref(new Set<string>());
const uploadingTypes = ref(new Set<string>());
const draggedOver = ref<string | null>(null);
const fileInputs = ref<Record<string, HTMLInputElement>>({});

const uploadDocumentTypes = [
  { value: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', color: 'green' },
  { value: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', color: 'blue' },
  { value: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', color: 'orange' },
  { value: 'resultats', label: 'Résultats', icon: 'i-lucide-file-check', color: 'emerald' },
  { value: 'autres_assurances', label: 'Autre prescription', icon: 'i-lucide-file-text', color: 'purple' },
  { value: 'other', label: 'Autre document', icon: 'i-lucide-file', color: 'gray' },
];

function setFileInput(docType: string, el: any) {
  if (el) fileInputs.value[docType] = el as HTMLInputElement;
}
function getDocumentsByType(documents: any[], docType: string) {
  if (!documents) return [];
  return documents.filter((doc: any) => doc.document_type === docType);
}
function getOtherDocuments(documents: any[]) {
  if (!documents) return [];
  const knownTypes = uploadDocumentTypes.map((t) => t.value);
  return documents.filter((doc: any) => !doc.document_type || !knownTypes.includes(doc.document_type));
}
function triggerFileInput(docType: string) {
  fileInputs.value[docType]?.click();
}
function handleDragOver(docType: string) {
  draggedOver.value = docType;
}
function handleDragLeave(docType: string) {
  if (draggedOver.value === docType) draggedOver.value = null;
}
async function handleDrop(event: DragEvent, docType: string) {
  draggedOver.value = null;
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  await uploadDocumentFile(files[0], docType);
}
async function handleFileSelectForType(event: Event, docType: string) {
  const target = event.target as HTMLInputElement;
  if (target.files?.length) {
    await uploadDocumentFile(target.files[0], docType);
    target.value = '';
  }
}
function setAppointmentForUpload(apt: any) {
  currentAppointmentForUpload.value = apt;
}

function openCancelModal(apt: any, loadAppointment: () => Promise<void>) {
  currentAppointmentForCancel.value = apt;
  currentLoadAppointmentForCancel.value = loadAppointment;
  showCancelModal.value = true;
}

async function uploadDocumentFile(file: File, docType: string) {
  const appointment = currentAppointmentForUpload.value ?? getAppointmentFromDetailRef(detailRef);
  if (!appointment) return;
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Le fichier dépasse la limite de 25 Mo autorisée.', color: 'error' });
    return;
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    toast.add({ title: 'Format non accepté', description: 'Formats acceptés : JPG, PNG, PDF uniquement.', color: 'error' });
    return;
  }
  uploadingTypes.value = new Set([...uploadingTypes.value, docType]);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('appointment_id', appointment.id);
    formData.append('document_type', docType);
    const response = await apiFetch('/medical-documents', { method: 'POST', body: formData });
    if (response.success) {
      toast.add({ title: 'Document uploadé', description: `${getDocumentTypeLabel(docType)} ajouté avec succès.`, color: 'success' });
      await detailRef.value?.loadDocuments();
    } else {
      toast.add({ title: "Erreur d'upload", description: response.error || "Impossible d'uploader le document", color: 'error' });
    }
  } catch (error: any) {
    toast.add({ title: "Erreur d'upload", description: error.message || "Une erreur est survenue lors de l'upload", color: 'error' });
  } finally {
    const next = new Set(uploadingTypes.value);
    next.delete(docType);
    uploadingTypes.value = next;
  }
}
async function downloadDocument(doc: any) {
  downloadingDocuments.value = new Set([...downloadingDocuments.value, doc.id]);
  try {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${apiBase}/medical-documents/${doc.id}/download`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors du téléchargement');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.add({ title: 'Téléchargement réussi', description: 'Le document a été téléchargé avec succès.', color: 'success' });
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Impossible de télécharger le document', color: 'error' });
  } finally {
    const next = new Set(downloadingDocuments.value);
    next.delete(doc.id);
    downloadingDocuments.value = next;
  }
}
function getFileIcon(mimeType: string) {
  if (mimeType?.startsWith('image/')) return 'i-lucide-image';
  if (mimeType === 'application/pdf') return 'i-lucide-file-text';
  return 'i-lucide-file';
}
function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
function getDocumentTypeLabel(type: string) {
  const labels: Record<string, string> = { carte_vitale: 'Carte Vitale', carte_mutuelle: 'Carte Mutuelle', ordonnance: 'Ordonnance', resultats: 'Résultats', autres_assurances: 'Autre prescription', other: 'Autre' };
  return labels[type] || 'Document';
}
function getDocumentTypeBadgeColor(type: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    carte_vitale: 'success', carte_mutuelle: 'info', ordonnance: 'warning', autres_assurances: 'secondary', other: 'neutral',
  };
  return colors[type] || 'neutral';
}
function getDocTypeBgClass(color: string) {
  const classes: Record<string, string> = { green: 'bg-green-100 dark:bg-green-900/30', blue: 'bg-blue-100 dark:bg-blue-900/30', orange: 'bg-orange-100 dark:bg-orange-900/30', purple: 'bg-purple-100 dark:bg-purple-900/30', emerald: 'bg-emerald-100 dark:bg-emerald-900/30', gray: 'bg-gray-100 dark:bg-gray-900/30' };
  return classes[color] || 'bg-gray-100 dark:bg-gray-900/30';
}
function getDocTypeIconClass(color: string) {
  const classes: Record<string, string> = { green: 'text-green-600 dark:text-green-400', blue: 'text-blue-600 dark:text-blue-400', orange: 'text-orange-600 dark:text-orange-400', purple: 'text-purple-600 dark:text-purple-400', emerald: 'text-emerald-600 dark:text-emerald-400', gray: 'text-gray-600 dark:text-gray-400' };
  return classes[color] || 'text-gray-600 dark:text-gray-400';
}

const updatingStatus = ref(false);

function assignBatchCount(appointment: any): number {
  const size = Number(appointment?.creation_batch_size ?? 0);
  return size > 1 ? size : 1;
}

function onAppointmentLoaded(_appointment: any) {
  /* assignation gérée par AdminAppointmentAssignmentCard */
}

onMounted(() => {
  loadStatusHistory();
});

const appointmentId = computed(() => route.params.id as string);

async function loadStatusHistory() {
  if (!appointmentId.value) return;
  try {
    const response = await apiFetch(`/appointments/${appointmentId.value}/history`, { method: 'GET' });
    if (response.success && response.data) {
      statusHistory.value = response.data;
    }
  } catch (error) {
    console.error("Erreur lors du chargement de l'historique:", error);
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    planned: 'sky',
    inProgress: 'purple',
    completed: 'green',
    canceled: 'red',
    expired: 'gray',
    refused: 'orange',
  };
  return colors[status] || 'gray';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status] || status;
}

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  const appointment = currentAppointmentForCancel.value;
  const loadAppointment = currentLoadAppointmentForCancel.value;
  if (!appointment?.id || typeof loadAppointment !== 'function') return;
  const appointmentId = String(appointment.id);
  currentAppointmentForCancel.value = null;
  currentLoadAppointmentForCancel.value = null;
  updatingStatus.value = true;
  try {
    const result = await cancelAppointmentWithOptionalPhoto(appointmentId, payload);
    if (result.ok) {
      showCancelModal.value = false;
      await loadAppointment();
      await loadStatusHistory();
      toast.add({
        title: 'Rendez-vous annulé',
        description: "L'annulation a été enregistrée avec le motif et le commentaire.",
        color: 'success',
      });
    } else {
      toast.add({
        title: result.photoUploadFailed ? 'Photo non envoyée' : 'Erreur',
        description: result.error,
        color: 'error',
      });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    updatingStatus.value = false;
  }
}

async function restoreAppointment(apt: any, loadAppointment: () => Promise<void>) {
  if (!apt) return;
  updatingStatus.value = true;
  try {
    const response = await apiFetch(`/appointments/${apt.id}`, {
      method: 'PUT',
      body: { status: 'pending', note: 'Restauré par administrateur' },
    });
    if (response.success) {
      await loadAppointment();
      await loadStatusHistory();
    }
  } catch (error) {
    console.error('Erreur lors de la restauration:', error);
  } finally {
    updatingStatus.value = false;
  }
}
</script>
