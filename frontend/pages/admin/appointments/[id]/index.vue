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

    <!-- Assignation : même système que détail lab (lab + préleveur pour prise de sang, infirmier pour soins) -->
    <template #assignationSection="{ appointment, loadAppointment }">
      <UCard v-if="appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)" class="overflow-hidden">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-user-cog" class="w-5 h-5 text-primary" />
            <span class="font-semibold text-gray-900 dark:text-white">Assignation</span>
          </div>
        </template>
        <div class="space-y-4">
          <template v-if="appointment.type === 'blood_test'">
            <p class="text-sm text-gray-500 dark:text-gray-400">Laboratoire (ou sous-compte) puis optionnellement un préleveur.</p>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Laboratoire assigné</label>
              <USelectMenu
                v-model="reassignLabId"
                :items="labSelectItems"
                value-key="value"
                :placeholder="labSelectPlaceholder"
                size="md"
                class="w-full min-w-0"
                :loading="labsLoading"
                :search-input="{ placeholder: 'Rechercher un labo...' }"
                :filter-fields="['label']"
              >
                <template #empty>
                  <div class="py-6 px-4">
                    <UEmpty
                      icon="i-lucide-building-2"
                      title="Aucun laboratoire trouvé"
                      description="Aucun laboratoire ne correspond à votre recherche."
                      variant="naked"
                      size="sm"
                    />
                  </div>
                </template>
              </USelectMenu>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Préleveur assigné</label>
              <USelectMenu
                v-model="reassignPreleveurId"
                :items="preleveurSelectItems"
                value-key="value"
                :placeholder="reassignLabId ? 'Choisir un préleveur (optionnel)' : 'Sélectionnez d\'abord un laboratoire'"
                size="md"
                class="w-full min-w-0"
                :loading="preleveursLoading"
                :disabled="!reassignLabId"
                :search-input="{ placeholder: 'Rechercher...' }"
                :filter-fields="['label']"
              >
                <template #empty>
                  <div class="py-6 px-4">
                    <UEmpty
                      icon="i-lucide-user-check"
                      title="Aucun préleveur trouvé"
                      description="Aucun préleveur ne correspond à votre recherche. Laissez vide si non assigné."
                      variant="naked"
                      size="sm"
                    />
                  </div>
                </template>
              </USelectMenu>
            </div>
            <UButton
              type="button"
              color="primary"
              variant="soft"
              size="md"
              leading-icon="i-lucide-check"
              :loading="reassigning"
              :disabled="!reassignLabId"
              block
              :on-click="() => reassignAppointment(appointment, loadAppointment)"
            >
              Appliquer l’assignation
            </UButton>
          </template>
          <template v-else-if="appointment.type === 'nursing'">
            <p class="text-sm text-gray-500 dark:text-gray-400">Assigner ce rendez-vous à un infirmier.</p>
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Infirmier assigné</label>
              <USelectMenu
                v-model="reassignNurseId"
                :items="nurseSelectItems"
                value-key="value"
                :placeholder="nurseSelectPlaceholder"
                size="md"
                class="w-full min-w-0"
                :loading="nursesLoading"
                :search-input="{ placeholder: 'Rechercher un infirmier...' }"
                :filter-fields="['label']"
              >
                <template #empty>
                  <div class="py-6 px-4">
                    <UEmpty
                      icon="i-lucide-stethoscope"
                      title="Aucun infirmier trouvé"
                      description="Aucun infirmier ne correspond à votre recherche."
                      variant="naked"
                      size="sm"
                    />
                  </div>
                </template>
              </USelectMenu>
            </div>
            <UButton
              type="button"
              color="primary"
              variant="soft"
              size="md"
              leading-icon="i-lucide-check"
              :loading="reassigning"
              :disabled="!reassignNurseId"
              block
              :on-click="() => reassignAppointment(appointment, loadAppointment)"
            >
              Appliquer l’assignation
            </UButton>
          </template>
        </div>
      </UCard>
    </template>

    <template #mainExtra="{ appointment, loadAppointment }">
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
const reassigning = ref(false);
const reassignLabId = ref('');
const reassignNurseId = ref('');
const reassignPreleveurId = ref('');
const labs = ref<any[]>([]);
const nurses = ref<any[]>([]);
const preleveurs = ref<any[]>([]);
const labsLoading = ref(false);
const nursesLoading = ref(false);
const preleveursLoading = ref(false);

const labSelectItems = computed(() =>
  labs.value.map((p) => ({
    label: (p.company_name && String(p.company_name).trim()) || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id,
    value: p.id,
  }))
);
const nurseSelectItems = computed(() => {
  const items = nurses.value.map((p) => ({
    label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id,
    value: p.id,
  }));
  const apt = loadedAppointmentForAssign.value ?? getAppointmentFromDetailRef(detailRef);
  const nurseId = apt?.assigned_nurse_id ? String(apt.assigned_nurse_id) : '';
  const displayName = apt?.assigned_nurse_display_name;
  if (nurseId && displayName && !items.some((i) => i.value === nurseId)) {
    items.unshift({ label: displayName, value: nurseId });
  }
  return items;
});
const preleveurSelectItems = computed(() => {
  const labId = reassignLabId.value;
  return preleveurs.value
    .filter((p) => !labId || String(p.lab_id || '') === String(labId))
    .map((p) => ({
      label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id,
      value: p.id,
    }));
});
function assignationIdAsString(val: unknown): string {
  if (val == null || val === '') return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'value' in val) return String((val as { value: unknown }).value);
  return String(val);
}
const currentLabName = computed(() => {
  const id = assignationIdAsString(reassignLabId.value);
  if (!id) return '';
  const lab = labs.value.find((p) => p.id === id);
  if (!lab) return id;
  return (lab.company_name && String(lab.company_name).trim()) || `${(lab.first_name || '').trim()} ${(lab.last_name || '').trim()}`.trim() || lab.email || id;
});
const currentNurseName = computed(() => {
  const id = assignationIdAsString(reassignNurseId.value);
  if (!id) return '';
  const nurse = nurses.value.find((p) => p.id === id);
  const name = nurse ? `${(nurse.first_name || '').trim()} ${(nurse.last_name || '').trim()}`.trim() || nurse.email || '' : '';
  return name || ((loadedAppointmentForAssign.value ?? getAppointmentFromDetailRef(detailRef))?.assigned_nurse_display_name ?? '');
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

const DEBUG_ASSIGN = true; // TODO: retirer après debug — logs console assignation admin
function syncAssignationFromAppointment(appointment: any) {
  if (DEBUG_ASSIGN) console.log('[Admin RDV Assignation] syncAssignationFromAppointment', appointment ? { id: appointment.id, type: appointment.type, assigned_lab_id: appointment.assigned_lab_id, assigned_to: appointment.assigned_to, assigned_nurse_id: appointment.assigned_nurse_id } : null);
  if (!appointment) return;
  const labId = appointment.assigned_lab_id != null ? String(appointment.assigned_lab_id) : '';
  const toId = appointment.assigned_to != null ? String(appointment.assigned_to) : '';
  const nurseId = appointment.assigned_nurse_id != null ? String(appointment.assigned_nurse_id) : '';
  if (appointment.type === 'blood_test') {
    reassignLabId.value = labId;
    reassignPreleveurId.value = toId;
    reassignNurseId.value = '';
    if (DEBUG_ASSIGN) console.log('[Admin RDV Assignation] sync blood_test →', { reassignLabId: labId, reassignPreleveurId: toId });
  } else if (appointment.type === 'nursing') {
    reassignNurseId.value = nurseId;
    reassignLabId.value = '';
    reassignPreleveurId.value = '';
    if (DEBUG_ASSIGN) console.log('[Admin RDV Assignation] sync nursing →', { reassignNurseId: nurseId });
  }
}

// Une seule règle : synchroniser les dropdowns d’assignation quand on a à la fois
// le RDV (référence) et les listes (labos, infirmiers, préleveurs). Ainsi après
// refresh ou navigation, les selects affichent le bon libellé sans nextTick ni double watch.
const loadedAppointmentForAssign = ref<any>(null);
const allListsLoaded = computed(() => !labsLoading.value && !nursesLoading.value && !preleveursLoading.value);

function trySyncAssignation() {
  if (!loadedAppointmentForAssign.value || !allListsLoaded.value) return;
  if (DEBUG_ASSIGN) console.log('[Admin RDV Assignation] trySyncAssignation → sync');
  syncAssignationFromAppointment(loadedAppointmentForAssign.value);
}

function onAppointmentLoaded(appointment: any) {
  if (DEBUG_ASSIGN) console.log('[Admin RDV Assignation] appointment-loaded', appointment?.id);
  loadedAppointmentForAssign.value = appointment ?? null;
  trySyncAssignation();
}

watch(allListsLoaded, (loaded) => {
  if (loaded) trySyncAssignation();
}, { immediate: true });

onMounted(async () => {
  loadStatusHistory();
  labsLoading.value = true;
  nursesLoading.value = true;
  preleveursLoading.value = true;
  try {
    const [labRes, subRes, nurseRes, prelRes] = await Promise.all([
      apiFetch('/users?role=lab&limit=500', { method: 'GET' }),
      apiFetch('/users?role=subaccount&limit=500', { method: 'GET' }),
      apiFetch('/users?role=nurse&limit=500', { method: 'GET' }),
      apiFetch('/users?role=preleveur&limit=500', { method: 'GET' }),
    ]);
    labs.value = [
      ...(labRes.success && labRes.data ? (labRes.data as any[]) : []),
      ...(subRes.success && subRes.data ? (subRes.data as any[]) : []),
    ];
    nurses.value = nurseRes.success && nurseRes.data ? (nurseRes.data as any[]) : [];
    preleveurs.value = prelRes.success && prelRes.data ? (prelRes.data as any[]) : [];
  } catch (error) {
    console.error('Erreur chargement labos/infirmiers/préleveurs:', error);
  } finally {
    labsLoading.value = false;
    nursesLoading.value = false;
    preleveursLoading.value = false;
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

function toId(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'value' in v) return String((v as { value: unknown }).value);
  if (typeof v === 'object' && v !== null && 'id' in v) return String((v as { id: unknown }).id);
  return String(v);
}

async function reassignAppointment(apt: { id: string; type?: string } | null, loadAppointment: () => Promise<void>) {
  const appointment = apt ?? getAppointmentFromDetailRef(detailRef);
  if (!appointment?.id) return;
  const isBloodTest = appointment.type === 'blood_test';
  const isNursing = appointment.type === 'nursing';
  const body: Record<string, string> = {};
  const labId = toId(reassignLabId.value);
  const preleveurId = toId(reassignPreleveurId.value);
  const nurseId = toId(reassignNurseId.value);
  if (isBloodTest && labId) {
    body.assigned_lab_id = labId;
    if (preleveurId) body.assigned_to = preleveurId;
  } else if (isNursing && nurseId) {
    body.assigned_nurse_id = nurseId;
  }
  if (Object.keys(body).length === 0) {
    toast.add({ title: 'Sélection requise', description: 'Choisissez un laboratoire ou un infirmier selon le type de rendez-vous.', color: 'amber' });
    return;
  }
  reassigning.value = true;
  try {
    const response = await apiFetch(`/appointments/${appointment.id}/reassign`, {
      method: 'POST',
      body,
    });
    if (response?.success) {
      toast.add({ title: 'Rendez-vous réassigné', color: 'green' });
      await loadAppointment();
    } else {
      const errMsg = (response as any)?.error ?? (response as any)?.message ?? 'Impossible de réassigner.';
      toast.add({ title: 'Erreur', description: errMsg, color: 'red' });
    }
  } catch (error: any) {
    const errMsg = error?.message ?? (error?.data?.error ?? 'Impossible de réassigner.');
    toast.add({ title: 'Erreur', description: errMsg, color: 'red' });
  } finally {
    reassigning.value = false;
  }
}

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  const appointment = currentAppointmentForCancel.value;
  const loadAppointment = currentLoadAppointmentForCancel.value;
  if (!appointment || typeof loadAppointment !== 'function') return;
  currentAppointmentForCancel.value = null;
  currentLoadAppointmentForCancel.value = null;
  updatingStatus.value = true;
  try {
    let photoDocId: string | null = null;
    if (payload.photoFile) {
      const formData = new FormData();
      formData.append('file', payload.photoFile);
      formData.append('appointment_id', appointment.id);
      formData.append('document_type', 'cancellation_photo');
      const uploadRes = await apiFetch('/medical-documents', { method: 'POST', body: formData });
      if (uploadRes.success && uploadRes.data?.id) photoDocId = uploadRes.data.id;
    }
    const body: Record<string, unknown> = {
      status: 'canceled',
      cancellation_reason: payload.reason,
      cancellation_comment: payload.comment,
    };
    if (photoDocId) body.cancellation_photo_document_id = photoDocId;
    const response = await apiFetch(`/appointments/${appointment.id}`, { method: 'PUT', body });
    if (response.success) {
      showCancelModal.value = false;
      await loadAppointment();
      await loadStatusHistory();
      toast.add({ title: 'Rendez-vous annulé', description: 'L\'annulation a été enregistrée avec le motif et le commentaire.', color: 'success' });
    } else {
      toast.add({ title: 'Erreur', description: response.error || 'Impossible d\'annuler le rendez-vous', color: 'error' });
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
