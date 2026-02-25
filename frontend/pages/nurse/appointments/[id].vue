<template>
  <AppointmentDetailPage
    ref="detailRef"
    base-path="/nurse"
  >
    <template #sidebarActions="{ appointment, loadAppointment }">
      <div class="flex flex-col gap-3">
        <UEmpty
          v-if="appointment.status === 'canceled'"
          icon="i-lucide-calendar-x"
          title="Rendez-vous annulé"
          description="Ce rendez-vous a été annulé. Aucune action disponible."
          variant="naked"
          size="md"
        />
        <template v-else>
        <UButton
          v-if="appointment.status === 'confirmed'"
          color="primary"
          variant="soft"
          size="lg"
          leading-icon="i-lucide-play"
          :loading="processing"
          :loading-auto="false"
          block
          @click="startAppointment(loadAppointment)"
        >
          Commencer le soin
        </UButton>
        <UButton
          v-if="appointment.status === 'inProgress'"
          color="success"
          variant="soft"
          size="lg"
          leading-icon="i-lucide-check-circle"
          :loading="processing"
          :loading-auto="false"
          block
          @click="completeAppointment"
        >
          Terminer le soin
        </UButton>
        <UButton
          v-if="['confirmed', 'inProgress'].includes(appointment.status)"
          type="button"
          color="primary"
          variant="soft"
          size="md"
          leading-icon="i-lucide-calendar-plus"
          block
          @click="openRescheduleModal(appointment)"
        >
          Reprendre RDV pour ce patient
        </UButton>
        <template v-if="appointment.status !== 'canceled' && (appointment.relative?.phone || appointment.form_data?.phone || appointment.address)">
          <UButton
            v-if="appointment.relative?.phone || appointment.form_data?.phone"
            type="button"
            color="info"
            variant="soft"
            size="md"
            leading-icon="i-lucide-message-square"
            block
            @click="sendSMS"
          >
            Message
          </UButton>
          <UButton
            v-if="appointment.address"
            type="button"
            color="warning"
            variant="soft"
            size="md"
            leading-icon="i-lucide-navigation"
            block
            @click="openInWaze"
          >
            Itinéraire Waze
          </UButton>
        </template>
        <UButton
          v-if="appointment.status === 'confirmed'"
          color="error"
          variant="soft"
          size="lg"
          leading-icon="i-lucide-x-circle"
          :loading="processing"
          :loading-auto="false"
          block
          @click="showCancelModal = true"
        >
          Annuler le rendez-vous
        </UButton>
        <div v-if="['confirmed', 'inProgress'].includes(appointment.status)" class="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div class="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p class="text-xs text-amber-700 dark:text-amber-300">
                Si vous ne pouvez pas effectuer ce rendez-vous, utilisez le bouton ci-dessous pour le remettre à disposition.
              </p>
            </div>
          </div>
          <UButton
            color="warning"
            variant="soft"
            size="lg"
            leading-icon="i-lucide-refresh-ccw"
            :loading="processing"
            :loading-auto="false"
            block
            @click="redispatchAppointment"
          >
            Redispatcher le rendez-vous
          </UButton>
        </div>
        </template>
      </div>
    </template>

    <template #documentsCard="{ appointment, documents, documentsLoading, loadDocuments }">
      <div v-if="canUploadDocuments(appointment)" class="mb-6 space-y-4">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-upload" class="w-5 h-5 text-gray-500" />
          <h3 class="text-sm font-normal text-gray-700 dark:text-gray-300">Ajouter des documents</h3>
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
        v-else-if="documents.length === 0 && !canUploadDocuments(appointment)"
        icon="i-lucide-file-x"
        title="Aucun document"
        description="Aucun document médical n'a été uploadé pour ce rendez-vous."
        variant="naked"
      />
      <div v-else-if="getOtherDocuments(documents).length > 0" class="space-y-3">
        <h3 class="text-sm font-normal text-gray-700 dark:text-gray-300 mb-2">Autres documents</h3>
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

    <template #patientCardActions="{ appointment }">
      <UButton
        v-if="appointment.address"
        variant="solid"
        size="md"
        leading-icon="i-lucide-navigation"
        block
        class="!bg-[#33CCFF] !text-white hover:!bg-[#2BB8E6] dark:!bg-[#33CCFF] dark:hover:!bg-[#2BB8E6] border-0"
        @click="openInWaze"
      >
        Itinéraire Waze
      </UButton>
      <UButton
        v-if="appointment.relative?.phone || appointment.form_data?.phone"
        color="success"
        variant="solid"
        size="md"
        leading-icon="i-lucide-phone"
        block
        @click="callPatient"
      >
        Appeler
      </UButton>
      <UButton
        v-if="appointment.relative?.phone || appointment.form_data?.phone"
        color="info"
        variant="solid"
        size="md"
        leading-icon="i-lucide-message-square"
        block
        @click="sendSMS"
      >
        Message
      </UButton>
    </template>
  </AppointmentDetailPage>

  <CancelAppointmentModal
    v-model:open="showCancelModal"
    :loading="processing"
    @confirm="onConfirmCancel"
  />
  <RescheduleAppointmentModal
    v-model="showRescheduleModal"
    :appointment="rescheduleAppointment"
    @done="onRescheduleDone"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

import { apiFetch } from '~/utils/api';

const toast = useAppToast();
const detailRef = ref<{ loadAppointment: () => Promise<void>; loadDocuments: () => Promise<void>; appointment: { value: any } } | null>(null);

// Rediriger vers la liste et ouvrir la popup pour les RDV en attente (accepter/refuser uniquement dans la popup, comme lab)
watch(
  () => detailRef.value?.appointment?.value,
  (app) => {
    if (app?.status === 'pending') {
      navigateTo(`/nurse/appointments?openAppointment=${app.id}`);
    }
  },
  { immediate: true },
);

const processing = ref(false);
const showCancelModal = ref(false);
const showRescheduleModal = ref(false);
const rescheduleAppointment = ref<any>(null);

function openRescheduleModal(apt: any) {
  rescheduleAppointment.value = apt ?? null;
  showRescheduleModal.value = true;
}

function onRescheduleDone(newAppointmentId?: string) {
  rescheduleAppointment.value = null;
  if (newAppointmentId) {
    navigateTo(`/nurse/appointments/${newAppointmentId}`);
  } else {
    detailRef.value?.loadAppointment();
  }
}
const downloadingDocuments = ref(new Set<string>());
const uploadingTypes = ref(new Set<string>());
const draggedOver = ref<string | null>(null);
const fileInputs = ref<Record<string, HTMLInputElement>>({});

function setFileInput(docType: string, el: any) {
  if (el) fileInputs.value[docType] = el as HTMLInputElement;
}

const uploadDocumentTypes = [
  { value: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', color: 'green' },
  { value: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', color: 'blue' },
  { value: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', color: 'orange' },
  { value: 'autres_assurances', label: 'Autres assurances', icon: 'i-lucide-briefcase', color: 'purple' },
  { value: 'other', label: 'Autre document', icon: 'i-lucide-file', color: 'gray' },
];

function canUploadDocuments(appointment: any) {
  return appointment && ['confirmed', 'inProgress'].includes(appointment.status);
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
  uploadingTypes.value.add(docType);
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
    uploadingTypes.value.delete(docType);
  }
}

async function downloadDocument(doc: any) {
  downloadingDocuments.value.add(doc.id);
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
    downloadingDocuments.value.delete(doc.id);
  }
}

function openInWaze() {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment?.address) return;
  const address = appointment.address;
  if (typeof address === 'object' && address.lat && address.lng) {
    window.open(`https://waze.com/ul?ll=${address.lat},${address.lng}&navigate=yes`, '_blank');
  } else {
    const text = typeof address === 'object' && address.label ? address.label : address;
    window.open(`https://waze.com/ul?q=${encodeURIComponent(text)}&navigate=yes`, '_blank');
  }
}

function callPatient() {
  const appointment = detailRef.value?.appointment?.value;
  const phone = appointment?.relative?.phone || appointment?.form_data?.phone;
  if (!phone) return;
  window.location.href = `tel:${phone.replace(/\s/g, '')}`;
}

function sendSMS() {
  const appointment = detailRef.value?.appointment?.value;
  const phone = appointment?.relative?.phone || appointment?.form_data?.phone;
  if (!phone) return;
  let scheduledDate = '';
  if (appointment?.scheduled_at) {
    try {
      scheduledDate = new Date(appointment.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      scheduledDate = appointment.scheduled_at;
    }
  }
  const address = typeof appointment?.address === 'object' && appointment?.address?.label ? appointment.address.label : appointment?.address || '';
  const firstName = appointment?.form_data?.first_name || '';
  const message = encodeURIComponent(`Bonjour ${firstName},\n\nVous avez un rendez-vous le ${scheduledDate}.\nAdresse : ${address}\n\nCordialement`);
  window.location.href = `sms:${phone.replace(/\s/g, '')}?body=${message}`;
}

async function startAppointment(loadAppointment: () => Promise<void>) {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
  processing.value = true;
  try {
    const response = await apiFetch(`/appointments/${appointment.id}`, { method: 'PUT', body: { status: 'inProgress' } });
    if (response.success) {
      toast.add({ title: 'Soin démarré', description: 'Le soin a été démarré avec succès.', color: 'success' });
      await loadAppointment();
      await detailRef.value?.loadDocuments();
    } else toast.add({ title: 'Erreur', description: response.error || 'Impossible de démarrer le soin', color: 'error' });
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    processing.value = false;
  }
}

function completeAppointment() {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
  processing.value = true;
  apiFetch(`/appointments/${appointment.id}`, { method: 'PUT', body: { status: 'completed' } })
    .then((response) => {
      if (response.success) {
        toast.add({ title: 'Soin terminé', description: 'Le soin a été terminé avec succès.', color: 'success' });
        navigateTo('/nurse/appointments');
      } else toast.add({ title: 'Erreur', description: response.error || 'Impossible de terminer le soin', color: 'error' });
    })
    .catch((error: any) => toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' }))
    .finally(() => { processing.value = false; });
}

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
  processing.value = true;
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
      toast.add({ title: 'Rendez-vous annulé', description: 'Le rendez-vous a été annulé avec succès.', color: 'success' });
      await navigateTo('/nurse/appointments');
    } else {
      toast.add({ title: 'Erreur', description: response.error || "Impossible d'annuler le rendez-vous", color: 'error' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    processing.value = false;
  }
}

function redispatchAppointment() {
  if (!confirm('Êtes-vous sûr de vouloir redispatcher ce rendez-vous ?\n\nLe rendez-vous sera remis en attente et assigné automatiquement à un autre infirmier de la zone.\nCette action est irréversible.')) return;
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
  processing.value = true;
  apiFetch(`/appointments/${appointment.id}`, { method: 'PUT', body: { status: 'pending', redispatch: true } })
    .then((response) => {
      if (response.success) {
        toast.add({ title: 'Rendez-vous redispatché', description: 'Le rendez-vous a été remis à disposition et sera assigné à un autre professionnel.', color: 'success' });
        navigateTo('/nurse/appointments');
      } else toast.add({ title: 'Erreur', description: response.error || 'Impossible de redispatcher le rendez-vous', color: 'error' });
    })
    .catch((error: any) => toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' }))
    .finally(() => { processing.value = false; });
}

function formatDate(date: string) {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return date;
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
</script>
