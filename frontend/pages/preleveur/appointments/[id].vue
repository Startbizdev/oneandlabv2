<template>
  <AppointmentDetailPage ref="detailRef" base-path="/preleveur">
    <template #documentsCard="{ appointment, documents, documentsLoading, loadDocuments }">
      <AppointmentDocumentsSection
        :documents="documents || []"
        :loading="documentsLoading"
        empty-description="Aucun document médical n'a été uploadé pour ce rendez-vous."
        :show-upload-area="canUploadDocuments(appointment)"
        :upload-types="uploadDocumentTypes"
        :show-resultats="false"
        :merge-resultats-into-documents-list="appointment?.type === 'blood_test'"
        :can-replace="canUploadDocuments(appointment)"
        :downloading-ids="downloadingDocuments"
        :uploading-types="uploadingTypes"
        @download="downloadDocument"
        @upload="(docType, file) => { setAppointmentForUpload(appointment); uploadDocumentFile(file, docType); }"
      />
    </template>
    <template #sidebarActions="{ appointment, loadAppointment }">
      <div class="flex flex-col gap-3">
        <UEmpty
          v-if="appointment && appointment.status === 'canceled'"
          icon="i-lucide-calendar-x"
          title="Rendez-vous annulé"
          description="Ce rendez-vous a été annulé. Aucune action disponible."
          variant="naked"
          size="md"
        />
        <UEmpty
          v-else-if="appointment && appointment.status === 'completed'"
          icon="i-lucide-check-circle"
          title="Rendez-vous terminé"
          description="Ce rendez-vous a été marqué comme terminé. Le patient pourra laisser un avis."
          variant="naked"
          size="md"
        />
        <template v-else>
          <template v-if="appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)">
            <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 border border-gray-100 dark:border-gray-700/80">
              Le rendez-vous passera automatiquement en « terminé » le jour suivant la date prévue (clôture système).
            </p>
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 px-0.5 pt-1">
              Planification
            </p>
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
          </template>
          <template v-if="appointment && (appointment.relative?.phone || appointment.form_data?.phone || appointment.address)">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 px-0.5 pt-1">
              Contact & déplacement
            </p>
            <UButton
              v-if="appointment.relative?.phone || appointment.form_data?.phone"
              type="button"
              color="neutral"
              variant="outline"
              size="md"
              leading-icon="i-lucide-message-square"
              block
              :on-click="() => openSms(appointment)"
            >
              Message
            </UButton>
            <UButton
              v-if="appointment?.address"
              type="button"
              color="warning"
              variant="outline"
              size="md"
              leading-icon="i-lucide-navigation"
              block
              :on-click="() => openWaze(appointment)"
            >
              Itinéraire Waze
            </UButton>
          </template>
          <template v-if="appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 px-0.5 pt-1">
              Annulation
            </p>
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
        </template>
      </div>
    </template>
  </AppointmentDetailPage>

  <CancelAppointmentModal
    v-model:open="showCancelModal"
    :loading="canceling"
    :on-confirm="onConfirmCancel"
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
  role: 'preleveur',
});

import { apiFetch } from '~/utils/api';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';
import { getAppointmentFromDetailRef } from '~/composables/useAppointmentDetailRef';
import { isPendingIncomingOffer } from '~/utils/appointment-offer';

const route = useRoute();
const toast = useAppToast();
const { user } = useAuth();
const detailRef = ref<{ loadAppointment: () => Promise<void>; appointment: { value: any } } | null>(null);
const showCancelModal = ref(false);
const currentAppointmentForCancel = ref<any>(null);
const currentLoadAppointmentForCancel = ref<(() => Promise<void>) | null>(null);
const showRescheduleModal = ref(false);
const canceling = ref(false);
const rescheduleAppointment = ref<any>(null);
const currentAppointmentForUpload = ref<any>(null);
const downloadingDocuments = ref(new Set<string>());
const uploadingTypes = ref(new Set<string>());

const uploadDocumentTypes = [
  { value: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', color: 'green' },
  { value: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', color: 'blue' },
  { value: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', color: 'orange' },
  { value: 'autres_assurances', label: 'Autre prescription', icon: 'i-lucide-file-text', color: 'purple' },
  { value: 'other', label: 'Autre document', icon: 'i-lucide-file', color: 'gray' },
];

watch(
  () => getAppointmentFromDetailRef(detailRef),
  (app) => {
    if (app && isPendingIncomingOffer(app, user.value?.id)) {
      navigateTo(`/preleveur?openAppointment=${app.id}`);
    }
  },
  { immediate: true },
);

function setAppointmentForUpload(apt: any) {
  currentAppointmentForUpload.value = apt;
}

function canUploadDocuments(appointment: any) {
  return appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status);
}

function getDocumentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    carte_vitale: 'Carte Vitale',
    carte_mutuelle: 'Carte Mutuelle',
    ordonnance: 'Ordonnance',
    resultats: 'Résultats',
    autres_assurances: 'Autre prescription',
    other: 'Autre',
  };
  return labels[type] || 'Document';
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
  uploadingTypes.value.add(docType);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('appointment_id', appointment.id);
    formData.append('document_type', docType);
    const response = await apiFetch('/medical-documents', { method: 'POST', body: formData });
    if (response.success) {
      toast.add({ title: 'Document uploadé', description: `${getDocumentTypeLabel(docType)} ajouté avec succès.`, color: 'success' });
      await detailRef.value?.loadDocuments?.();
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
    navigateTo(`/preleveur/appointments/${newAppointmentId}`);
  } else {
    detailRef.value?.loadAppointment?.();
  }
}

function openSms(apt: any) {
  const phone = apt?.relative?.phone || apt?.form_data?.phone;
  if (!phone) return;
  window.location.href = `sms:${phone.replace(/\s/g, '')}`;
}

function openWaze(apt: any) {
  if (!apt?.address) return;
  const address = apt.address;
  if (typeof address === 'object' && address.lat != null && address.lng != null) {
    window.open(`https://waze.com/ul?ll=${address.lat},${address.lng}&navigate=yes`, '_blank');
  } else {
    const text = typeof address === 'object' && address.label ? address.label : String(address);
    window.open(`https://waze.com/ul?q=${encodeURIComponent(text)}&navigate=yes`, '_blank');
  }
}

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  const apt = currentAppointmentForCancel.value;
  const loadAppointment = currentLoadAppointmentForCancel.value;
  const appointmentId = apt?.id ?? route.params?.id;
  if (!appointmentId || typeof loadAppointment !== 'function') return;
  currentAppointmentForCancel.value = null;
  currentLoadAppointmentForCancel.value = null;
  canceling.value = true;
  try {
    let photoDocId: string | null = null;
    if (payload.photoFile) {
      const formData = new FormData();
      formData.append('file', payload.photoFile);
      formData.append('appointment_id', appointmentId);
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
    const response = await apiFetch(`/appointments/${appointmentId}`, { method: 'PUT', body });
    if (response.success) {
      showCancelModal.value = false;
      await loadAppointment();
      toast.add({ title: 'Rendez-vous annulé', description: 'L\'annulation a été enregistrée.', color: 'success' });
    } else {
      toast.add({ title: 'Erreur', description: response.error || "Impossible d'annuler le rendez-vous", color: 'error' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    canceling.value = false;
  }
}
</script>
