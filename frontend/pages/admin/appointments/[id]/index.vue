<template>
  <AppointmentDetailPage ref="detailRef" base-path="/admin">
    <template #sidebarActions="{ appointment, loadAppointment }">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Changer le statut</label>
          <div class="flex gap-2">
            <USelect v-model="newStatus" :items="statusOptions" value-key="value" placeholder="Sélectionner un statut" class="flex-1" />
            <UButton @click="updateStatus(loadAppointment)" :loading="updatingStatus">
              Mettre à jour
            </UButton>
          </div>
        </div>
        <div v-if="appointment.type === 'blood_test'">
          <label class="block text-sm font-medium mb-2">Assigner à un laboratoire</label>
          <div class="flex flex-col sm:flex-row gap-2">
            <USelectMenu
              v-model="reassignLabId"
              :items="labSelectItems"
              value-key="value"
              :placeholder="labSelectPlaceholder"
              size="md"
              class="flex-1 min-w-0"
              :loading="labsLoading"
              :search-input="{ placeholder: 'Rechercher un labo...' }"
              :filter-fields="['label']"
            />
            <UButton
              type="button"
              color="primary"
              variant="solid"
              size="md"
              :loading="reassigning"
              :disabled="!reassignLabId"
              @click="reassignAppointment(loadAppointment)"
            >
              Réassigner
            </UButton>
          </div>
        </div>
        <div v-else-if="appointment.type === 'nursing'">
          <label class="block text-sm font-medium mb-2">Assigner à un infirmier</label>
          <div class="flex flex-col sm:flex-row gap-2">
            <USelectMenu
              v-model="reassignNurseId"
              :items="nurseSelectItems"
              value-key="value"
              :placeholder="nurseSelectPlaceholder"
              size="md"
              class="flex-1 min-w-0"
              :loading="nursesLoading"
              :search-input="{ placeholder: 'Rechercher un infirmier...' }"
              :filter-fields="['label']"
            />
            <UButton
              type="button"
              color="primary"
              variant="solid"
              size="md"
              :loading="reassigning"
              :disabled="!reassignNurseId"
              @click="reassignAppointment(loadAppointment)"
            >
              Réassigner
            </UButton>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <UButton
            v-if="appointment.status !== 'canceled'"
            type="button"
            color="error"
            variant="solid"
            size="md"
            leading-icon="i-lucide-x-circle"
            :loading="updatingStatus"
            @click="cancelAppointment(loadAppointment)"
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
            @click="restoreAppointment(loadAppointment)"
          >
            Restaurer le rendez-vous
          </UButton>
        </div>
      </div>
    </template>

    <template #documentsCard="{ appointment, documents, documentsLoading, loadDocuments }">
      <div v-if="appointment" class="mb-6 space-y-4">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-upload" class="w-5 h-5 text-gray-500" />
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Ajouter des documents</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="docType in uploadDocumentTypes"
            :key="docType.value"
            class="relative group"
            @dragover.prevent="handleDragOver(docType.value)"
            @dragleave.prevent="handleDragLeave(docType.value)"
            @drop.prevent="handleDrop($event, docType.value)"
          >
            <input
              :ref="el => setFileInput(docType.value, el)"
              type="file"
              accept="image/*,.pdf"
              class="hidden"
              @change="handleFileSelectForType($event, docType.value)"
            >
            <div
              :class="[
                'relative p-3 rounded-lg border-2 transition-all min-h-[100px] flex flex-col',
                draggedOver === docType.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500',
                uploadingTypes.has(docType.value) ? 'opacity-50 pointer-events-none' : '',
                getDocumentsByType(documents, docType.value).length > 0 ? 'border-solid' : 'border-dashed cursor-pointer'
              ]"
              @click="getDocumentsByType(documents, docType.value).length === 0 && !uploadingTypes.has(docType.value) ? triggerFileInput(docType.value) : null"
            >
              <div class="flex items-center gap-2 mb-2">
                <div :class="['flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0', getDocTypeBgClass(docType.color)]">
                  <UIcon :name="docType.icon" :class="['w-4 h-4', getDocTypeIconClass(docType.color)]" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-900 dark:text-white">{{ docType.label }}</p>
                  <p v-if="getDocumentsByType(documents, docType.value).length === 0" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Glisser-déposer ou cliquer</p>
                </div>
                <UIcon v-if="uploadingTypes.has(docType.value)" name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary-500 flex-shrink-0" />
                <UIcon v-else-if="getDocumentsByType(documents, docType.value).length === 0" name="i-lucide-upload" class="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
              </div>
              <div v-if="getDocumentsByType(documents, docType.value).length > 0" class="flex-1 space-y-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div
                  v-for="doc in getDocumentsByType(documents, docType.value)"
                  :key="doc.id"
                  class="flex items-center justify-between gap-1.5 px-1.5 py-1 bg-gray-50 dark:bg-gray-800/50 rounded text-xs"
                >
                  <div class="flex items-center gap-1.5 flex-1 min-w-0">
                    <UIcon :name="getFileIcon(doc.mime_type)" class="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <p class="font-medium text-gray-900 dark:text-white truncate text-xs">{{ doc.file_name }}</p>
                  </div>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-download"
                    :loading="downloadingDocuments.has(doc.id)"
                    :loading-auto="false"
                    :ui="{ size: { xs: 'h-5 w-5 p-0' } }"
                    @click.stop="downloadDocument(doc)"
                  />
                </div>
              </div>
              <div v-if="getDocumentsByType(documents, docType.value).length === 0" class="flex-1 flex items-center justify-center">
                <p class="text-xs text-gray-400 dark:text-gray-500">Cliquez pour ajouter</p>
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <UIcon name="i-lucide-info" class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p class="text-xs text-blue-700 dark:text-blue-300">Formats acceptés : JPG, PNG, PDF • Taille maximale : 10 MB par fichier</p>
        </div>
      </div>
      <div v-if="documentsLoading" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary-500" />
      </div>
      <UEmpty
        v-else-if="!documents?.length && appointment"
        icon="i-lucide-file-x"
        title="Aucun document"
        description="Aucun document médical n'a été uploadé pour ce rendez-vous."
        variant="naked"
      />
      <div v-else-if="documents && getOtherDocuments(documents).length > 0" class="space-y-3">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Autres documents</h3>
        <div
          v-for="doc in getOtherDocuments(documents)"
          :key="doc.id"
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
            <UIcon :name="getFileIcon(doc.mime_type)" class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ doc.file_name }}</p>
                <UBadge v-if="doc.document_type" :color="getDocumentTypeBadgeColor(doc.document_type)" variant="soft" size="xs" :label="getDocumentTypeLabel(doc.document_type)" />
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatFileSize(doc.file_size) }} • {{ formatDate(doc.created_at) }}</p>
            </div>
          </div>
          <UButton color="neutral" variant="ghost" size="sm" leading-icon="i-lucide-download" :loading="downloadingDocuments.has(doc.id)" :loading-auto="false" class="w-full sm:w-auto" @click="downloadDocument(doc)">
            Télécharger
          </UButton>
        </div>
      </div>
    </template>

    <template #mainExtra="{ appointment, loadAppointment }">
      <UCard v-if="statusHistory.length > 0" class="mt-6">
        <template #header>
          <h2 class="text-xl font-bold">Historique des statuts</h2>
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
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

import { apiFetch } from '~/utils/api';

const route = useRoute();
const detailRef = ref<{ loadAppointment: () => Promise<void>; loadDocuments: () => Promise<void>; appointment: { value: any } } | null>(null);
const toast = useToast();

const statusHistory = ref<any[]>([]);
const downloadingDocuments = ref(new Set<string>());
const uploadingTypes = ref(new Set<string>());
const draggedOver = ref<string | null>(null);
const fileInputs = ref<Record<string, HTMLInputElement>>({});

const uploadDocumentTypes = [
  { value: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', color: 'green' },
  { value: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', color: 'blue' },
  { value: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', color: 'orange' },
  { value: 'autres_assurances', label: 'Autres assurances', icon: 'i-lucide-briefcase', color: 'purple' },
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
async function uploadDocumentFile(file: File, docType: string) {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
  if (file.size > 10 * 1024 * 1024) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Le fichier dépasse la limite de 10 MB autorisée.', color: 'error' });
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
  const labels: Record<string, string> = { carte_vitale: 'Carte Vitale', carte_mutuelle: 'Carte Mutuelle', ordonnance: 'Ordonnance', autres_assurances: 'Autres assurances', other: 'Autre' };
  return labels[type] || 'Document';
}
function getDocumentTypeBadgeColor(type: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    carte_vitale: 'success', carte_mutuelle: 'info', ordonnance: 'warning', autres_assurances: 'secondary', other: 'neutral',
  };
  return colors[type] || 'neutral';
}
function getDocTypeBgClass(color: string) {
  const classes: Record<string, string> = { green: 'bg-green-100 dark:bg-green-900/30', blue: 'bg-blue-100 dark:bg-blue-900/30', orange: 'bg-orange-100 dark:bg-orange-900/30', purple: 'bg-purple-100 dark:bg-purple-900/30', gray: 'bg-gray-100 dark:bg-gray-900/30' };
  return classes[color] || 'bg-gray-100 dark:bg-gray-900/30';
}
function getDocTypeIconClass(color: string) {
  const classes: Record<string, string> = { green: 'text-green-600 dark:text-green-400', blue: 'text-blue-600 dark:text-blue-400', orange: 'text-orange-600 dark:text-orange-400', purple: 'text-purple-600 dark:text-purple-400', gray: 'text-gray-600 dark:text-gray-400' };
  return classes[color] || 'text-gray-600 dark:text-gray-400';
}

const updatingStatus = ref(false);
const reassigning = ref(false);
const newStatus = ref('');
const reassignLabId = ref('');
const reassignNurseId = ref('');
const labs = ref<any[]>([]);
const nurses = ref<any[]>([]);
const labsLoading = ref(false);
const nursesLoading = ref(false);

const labSelectItems = computed(() =>
  labs.value.map((p) => ({
    label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id,
    value: p.id,
  }))
);
const nurseSelectItems = computed(() =>
  nurses.value.map((p) => ({
    label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id,
    value: p.id,
  }))
);
const currentLabName = computed(() => {
  const id = reassignLabId.value;
  if (!id) return '';
  const lab = labs.value.find((p) => p.id === id);
  return lab ? `${(lab.first_name || '').trim()} ${(lab.last_name || '').trim()}`.trim() || lab.email || id : '';
});
const currentNurseName = computed(() => {
  const id = reassignNurseId.value;
  if (!id) return '';
  const nurse = nurses.value.find((p) => p.id === id);
  return nurse ? `${(nurse.first_name || '').trim()} ${(nurse.last_name || '').trim()}`.trim() || nurse.email || id : '';
});
const labSelectPlaceholder = computed(() => {
  if (labsLoading.value) return 'Chargement...';
  if (currentLabName.value) return `Laboratoire assigné : ${currentLabName.value}`;
  return 'Rechercher un laboratoire...';
});
const nurseSelectPlaceholder = computed(() => {
  if (nursesLoading.value) return 'Chargement...';
  if (currentNurseName.value) return `Infirmier assigné : ${currentNurseName.value}`;
  return 'Rechercher un infirmier...';
});

const statusOptions = [
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'canceled' },
  { label: 'Expiré', value: 'expired' },
  { label: 'Refusé', value: 'refused' },
];

watch(
  () => detailRef.value?.appointment?.value,
  (appointment) => {
    if (appointment) {
      newStatus.value = appointment.status;
      if (appointment.type === 'blood_test') {
        reassignLabId.value = appointment.assigned_lab_id ?? '';
      } else if (appointment.type === 'nursing') {
        reassignNurseId.value = appointment.assigned_nurse_id ?? '';
      }
    }
  },
  { immediate: true }
);

onMounted(async () => {
  loadStatusHistory();
  labsLoading.value = true;
  nursesLoading.value = true;
  try {
    const [labRes, subRes, nurseRes] = await Promise.all([
      apiFetch('/users?role=lab&limit=500', { method: 'GET' }),
      apiFetch('/users?role=subaccount&limit=500', { method: 'GET' }),
      apiFetch('/users?role=nurse&limit=500', { method: 'GET' }),
    ]);
    labs.value = [
      ...(labRes.success && labRes.data ? (labRes.data as any[]) : []),
      ...(subRes.success && subRes.data ? (subRes.data as any[]) : []),
    ];
    nurses.value = nurseRes.success && nurseRes.data ? (nurseRes.data as any[]) : [];
  } catch (error) {
    console.error('Erreur chargement labos/infirmiers:', error);
  } finally {
    labsLoading.value = false;
    nursesLoading.value = false;
  }
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
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status] || status;
}

async function updateStatus(loadAppointment: () => Promise<void>) {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment || !newStatus.value || newStatus.value === appointment.status) return;
  updatingStatus.value = true;
  try {
    const response = await apiFetch(`/appointments/${appointment.id}`, {
      method: 'PUT',
      body: { status: newStatus.value, note: 'Changement manuel par administrateur' },
    });
    if (response.success) {
      await loadAppointment();
      await loadStatusHistory();
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
  } finally {
    updatingStatus.value = false;
  }
}

async function reassignAppointment(loadAppointment: () => Promise<void>) {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
  const isBloodTest = appointment.type === 'blood_test';
  const isNursing = appointment.type === 'nursing';
  const body: Record<string, string> = {};
  if (isBloodTest && reassignLabId.value) body.assigned_lab_id = reassignLabId.value;
  else if (isNursing && reassignNurseId.value) body.assigned_nurse_id = reassignNurseId.value;
  if (Object.keys(body).length === 0) return;
  reassigning.value = true;
  const toast = useToast();
  try {
    const response = await apiFetch(`/appointments/${appointmentId.value}/reassign`, {
      method: 'POST',
      body,
    });
    if (response.success) {
      toast.add({ title: 'Rendez-vous réassigné', color: 'green' });
      if (isBloodTest) reassignLabId.value = '';
      if (isNursing) reassignNurseId.value = '';
      await loadAppointment();
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  } finally {
    reassigning.value = false;
  }
}

async function cancelAppointment(loadAppointment: () => Promise<void>) {
  if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) return;
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
  updatingStatus.value = true;
  try {
    const response = await apiFetch(`/appointments/${appointment.id}`, {
      method: 'PUT',
      body: { status: 'canceled', note: 'Annulé par administrateur' },
    });
    if (response.success) {
      await loadAppointment();
      await loadStatusHistory();
    }
  } catch (error) {
    console.error("Erreur lors de l'annulation:", error);
  } finally {
    updatingStatus.value = false;
  }
}

async function restoreAppointment(loadAppointment: () => Promise<void>) {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
  updatingStatus.value = true;
  try {
    const response = await apiFetch(`/appointments/${appointment.id}`, {
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
