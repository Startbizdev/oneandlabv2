<template>
  <AppointmentDetailPage ref="detailRef" base-path="/pro" :show-sidebar-actions-card="standardSidebarActionsCardVisible">
    <template #prescriptionSection="{ appointment, documents, loadDocuments }">
      <PrescriptionSection
        v-if="appointment && !['canceled'].includes(appointment.status)"
        :appointment="appointment"
        :documents="documents"
        :load-documents="loadDocuments"
      />
    </template>
    <template #carePhotosCard="{ appointment, documents, documentsLoading, loadDocuments }">
      <RdvCarePhotosSection
        v-if="appointment && isCarePhotoGalleryContext(appointment)"
        :appointment="appointment as Record<string, unknown>"
        :documents="documents || []"
        :documents-loading="documentsLoading"
        :enable-care-photo-upload="canUploadCarePhotos(appointment, user)"
        :care-photo-uploading="carePhotoUploading"
        @download="downloadDocument"
        @care-photo-upload="uploadCarePhotoFile"
        @care-photo-thread-updated="() => loadDocuments()"
        @load-documents-needed="loadDocuments"
      />
    </template>

    <template #documentsCard="{ appointment, documents, documentsLoading, loadDocuments }">
      <AppointmentDocumentsSection
        :documents="documents || []"
        :loading="documentsLoading"
        empty-description="Aucun document médical n'a été déposé pour ce rendez-vous."
        :show-upload-area="canUploadDocuments(appointment)"
        :upload-types="uploadDocumentTypes"
        :can-replace="canUploadDocuments(appointment)"
        :downloading-ids="downloadingDocIds"
        :uploading-types="uploadingTypes"
        :care-photo-appointment-id="appointment?.id ?? null"
        :omit-care-photos-in-list="true"
        @download="downloadDocument"
        @upload="(docType, file) => { setAppointmentForUpload(appointment); uploadDocumentFile(file, docType); }"
        @care-photo-thread-updated="() => loadDocuments()"
      />
    </template>
    <template #mainExtra="{ appointment }">
      <UCard
        v-if="appointment && appointment.status === 'completed' && patientReview"
        id="pro-patient-review-section"
        class="scroll-mt-24"
      >
        <template #header>
          <h2 class="text-lg font-normal flex items-center gap-2">
            <UIcon name="i-lucide-star" class="w-5 h-5 text-amber-500" />
            Avis patient
          </h2>
        </template>
        <div class="space-y-3">
          <div class="flex gap-0.5">
            <UIcon
              v-for="i in 5"
              :key="i"
              :name="i <= (patientReview.rating || 0) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
              class="w-5 h-5 text-amber-400"
            />
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {{ patientReview.comment || 'Pas de commentaire' }}
          </p>
        </div>
      </UCard>
    </template>
    <template #sidebarActions="{ appointment, loadAppointment }">
      <AppointmentDetailSidebarTerminalShell :status="appointment?.status">
        <div class="flex flex-col gap-3">
          <template v-if="appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              size="md"
              leading-icon="i-lucide-calendar-plus"
              block
              :on-click="() => openRescheduleModal(appointment)"
            >
              Reprendre RDV pour ce patient
            </UButton>
            <UButton
              type="button"
              color="error"
              variant="outline"
              size="md"
              leading-icon="i-lucide-x-circle"
              :loading="canceling"
              block
              :on-click="() => openCancelModal(appointment, loadAppointment)"
            >
              Annuler le rendez-vous
            </UButton>
          </template>
        </div>
      </AppointmentDetailSidebarTerminalShell>
    </template>
  </AppointmentDetailPage>

  <CancelAppointmentModal
    v-model:open="showCancelModal"
    :loading="canceling"
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
  role: 'pro',
});

import { nextTick, watch, computed } from 'vue';
import { apiFetch } from '~/utils/api';
import { cancelAppointmentWithOptionalPhoto } from '~/utils/appointment-cancellation';
import { getAppointmentFromDetailRef } from '~/composables/useAppointmentDetailRef';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';
import { canUploadMedicalDocumentsForAppointmentStatus } from '~/utils/appointment-documents-upload';
import { standardAppointmentSidebarCardVisible } from '~/utils/appointment-sidebar-terminal';
import { isCarePhotoGalleryContext, canUploadCarePhotos } from '~/utils/care-photo-gallery-context';

const route = useRoute();
const toast = useAppToast();
const { user } = useAuth();
const patientReview = ref<Record<string, unknown> | null>(null);

async function loadPatientReviewForRoute() {
  const id = route.params?.id;
  if (typeof id !== 'string' || !id) {
    patientReview.value = null;
    return;
  }
  try {
    const res = await apiFetch(`/reviews?appointment_id=${encodeURIComponent(id)}`, { method: 'GET' });
    patientReview.value = res?.success && Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
  } catch {
    patientReview.value = null;
  }
}

watch(
  () => [route.params.id, route.query.review] as const,
  async () => {
    await loadPatientReviewForRoute();
    const r = route.query.review;
    const highlight = r === '1' || r === 1;
    if (highlight && patientReview.value) {
      nextTick(() => {
        document.getElementById('pro-patient-review-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  },
  { immediate: true },
);
const config = useRuntimeConfig();
const downloadingDocId = ref<string | null>(null);
const downloadingDocIds = computed(() => (downloadingDocId.value ? [downloadingDocId.value] : []));

function getDocumentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    carte_vitale: 'Carte Vitale',
    carte_mutuelle: 'Carte Mutuelle',
    ordonnance: 'Ordonnance',
    resultats: 'Résultats',
    autres_assurances: 'Autre prescription',
    other: 'Autre',
  };
  return labels[type] || type;
}

async function downloadDocument(doc: { id: string; file_name: string }) {
  downloadingDocId.value = doc.id;
  try {
    const apiBase = config.public?.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${apiBase}/medical-documents/${doc.id}/download`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || 'Erreur lors du téléchargement');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.add({ title: 'Téléchargement', description: 'Le document est en cours de téléchargement.', color: 'success' });
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Téléchargement impossible', color: 'error' });
  } finally {
    downloadingDocId.value = null;
  }
}
const detailRef = ref<{ loadAppointment: () => Promise<void>; loadDocuments?: () => Promise<void>; appointment: { value: any } } | null>(null);

const standardSidebarActionsCardVisible = computed(() =>
  standardAppointmentSidebarCardVisible(getAppointmentFromDetailRef(detailRef)),
);
const uploadingTypes = ref(new Set<string>());
const currentAppointmentForUpload = ref<any>(null);

const uploadDocumentTypes = [
  { value: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', color: 'green' },
  { value: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', color: 'blue' },
  { value: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', color: 'orange' },
  { value: 'resultats', label: 'Résultats', icon: 'i-lucide-file-check', color: 'emerald' },
  { value: 'autres_assurances', label: 'Autre prescription', icon: 'i-lucide-file-text', color: 'purple' },
  { value: 'other', label: 'Autre document', icon: 'i-lucide-file', color: 'gray' },
];

function canUploadDocuments(appointment: any) {
  return !!appointment && canUploadMedicalDocumentsForAppointmentStatus(appointment.status);
}

const carePhotoUploading = ref(false);

async function uploadCarePhotoFile(file: File) {
  const appointment = getAppointmentFromDetailRef(detailRef);
  if (!appointment?.id) return;
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowed.includes(file.type)) {
    toast.add({ title: 'Format', description: 'Utilisez une image JPG ou PNG.', color: 'warning' });
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Le fichier dépasse la limite de 25 Mo.', color: 'error' });
    return;
  }
  carePhotoUploading.value = true;
  try {
    const apiBase = config.public?.apiBase || '';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const csrf = (typeof window !== 'undefined' && (window as any).__csrfTokenCache) || '';
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${apiBase}/appointments/${appointment.id}/care-photos`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Upload échoué');
    toast.add({ title: 'Photo ajoutée', color: 'success' });
    await detailRef.value?.loadDocuments?.();
  } catch (e: any) {
    toast.add({ title: 'Upload', description: e?.message || 'Erreur', color: 'error' });
  } finally {
    carePhotoUploading.value = false;
  }
}

function setAppointmentForUpload(apt: any) {
  currentAppointmentForUpload.value = apt;
}

async function uploadDocumentFile(file: File, docType: string) {
  const appointment = currentAppointmentForUpload.value ?? getAppointmentFromDetailRef(detailRef);
  if (!appointment) return;
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Le fichier dépasse 25 Mo.', color: 'error' });
    return;
  }
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowed.includes(file.type)) {
    toast.add({ title: 'Format non accepté', description: 'Formats acceptés : JPG, PNG, PDF.', color: 'error' });
    return;
  }
  uploadingTypes.value.add(docType);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('appointment_id', appointment.id);
    formData.append('document_type', docType);
    const res = await apiFetch('/medical-documents', { method: 'POST', body: formData });
    if (res?.success) {
      toast.add({ title: 'Document uploadé', description: `${getDocumentTypeLabel(docType)} ajouté.`, color: 'success' });
      await detailRef.value?.loadDocuments?.();
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error || "Impossible d'uploader", color: 'error' });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    uploadingTypes.value.delete(docType);
  }
}

const showCancelModal = ref(false);
const showRescheduleModal = ref(false);
const currentAppointmentForCancel = ref<any>(null);
const currentLoadAppointmentForCancel = ref<(() => Promise<void>) | null>(null);
const canceling = ref(false);
const rescheduleAppointment = ref<any>(null);

function openCancelModal(apt: any, loadAppointment: () => Promise<void>) {
  currentAppointmentForCancel.value = apt;
  currentLoadAppointmentForCancel.value = loadAppointment;
  showCancelModal.value = true;
}

function openRescheduleModal(apt: any) {
  rescheduleAppointment.value = apt ?? null;
  showRescheduleModal.value = true;
}

function onRescheduleDone(newAppointmentId?: string) {
  rescheduleAppointment.value = null;
  if (newAppointmentId) {
    navigateTo(`/pro/appointments/${newAppointmentId}`);
  } else {
    detailRef.value?.loadAppointment?.();
  }
}

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  const apt = currentAppointmentForCancel.value;
  const loadAppointment = currentLoadAppointmentForCancel.value;
  const appointmentId = String(apt?.id ?? route.params?.id ?? '');
  if (!appointmentId || typeof loadAppointment !== 'function') return;
  currentAppointmentForCancel.value = null;
  currentLoadAppointmentForCancel.value = null;
  canceling.value = true;
  try {
    const result = await cancelAppointmentWithOptionalPhoto(appointmentId, payload);
    if (result.ok) {
      showCancelModal.value = false;
      await loadAppointment();
      toast.add({ title: 'Rendez-vous annulé', description: "L'annulation a été enregistrée.", color: 'success' });
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
    canceling.value = false;
  }
}
</script>
