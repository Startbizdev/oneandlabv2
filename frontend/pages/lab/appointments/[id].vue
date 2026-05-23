<template>
  <AppointmentDetailPage ref="detailRef" base-path="/lab" :show-sidebar-actions-card="standardSidebarActionsCardVisible">
    <template #documentsCard="{ appointment, documents, documentsLoading, loadDocuments }">
      <AppointmentDocumentsSection
        :documents="documents || []"
        :loading="documentsLoading"
        empty-description="Aucun document médical n'a été déposé pour ce rendez-vous (ex. par le patient à la prise de RDV)."
        :show-upload-area="canUploadDocuments(appointment)"
        :upload-types="uploadTypesForAppointment(appointment)"
        :can-replace="canUploadDocuments(appointment)"
        :downloading-ids="downloadingDocIds"
        :uploading-types="uploadingTypes"
        @download="downloadDocument"
        @upload="(docType, file) => { setAppointmentForUpload(appointment); uploadDocumentFile(file, docType); }"
      />
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
    <!-- Section Assignation : composant réutilisable lab/sous-compte + préleveur -->
    <template #assignationSection="{ appointment, loadAppointment }">
      <AppointmentLabAssignmentCard
        :appointment="appointment"
        :load-appointment="loadAppointment"
      />
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
  role: ['lab', 'subaccount'],
});

import AppointmentLabAssignmentCard from '~/components/dashboard/AppointmentLabAssignmentCard.vue';
import { getAppointmentFromDetailRef } from '~/composables/useAppointmentDetailRef';
import { apiFetch } from '~/utils/api';
import { cancelAppointmentWithOptionalPhoto } from '~/utils/appointment-cancellation';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';
import { isPendingIncomingOffer } from '~/utils/appointment-offer';
import { standardAppointmentSidebarCardVisible } from '~/utils/appointment-sidebar-terminal';
import {
  canUploadLabResultatsForAppointmentStatus,
  canUploadMedicalDocumentsForAppointmentStatus,
} from '~/utils/appointment-documents-upload';

const toast = useAppToast();
const { user } = useAuth();
const config = useRuntimeConfig();
const route = useRoute();
const detailRef = ref<{ loadAppointment: () => Promise<void>; loadDocuments?: () => Promise<void>; appointment: unknown } | null>(null);
const standardSidebarActionsCardVisible = computed(() =>
  standardAppointmentSidebarCardVisible(getAppointmentFromDetailRef(detailRef)),
);
const showCancelModal = ref(false);
const downloadingDocId = ref<string | null>(null);
const downloadingDocIds = computed(() => (downloadingDocId.value ? [downloadingDocId.value] : []));
const uploadingTypes = ref(new Set<string>());
const currentAppointmentForUpload = ref<any>(null);

const uploadDocumentTypes = [
  { value: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', color: 'green' },
  { value: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', color: 'blue' },
  { value: 'ordonnance', label: 'Ordonnance', icon: 'i-lucide-file-text', color: 'orange' },
  {
    value: 'resultats',
    label: "Résultats d'analyses",
    icon: 'i-lucide-flask-conical',
    color: 'red',
    accept: 'application/pdf',
    hint: 'PDF uniquement • max 25 Mo',
  },
  { value: 'autres_assurances', label: 'Autre prescription', icon: 'i-lucide-file-text', color: 'purple' },
  { value: 'other', label: 'Autre document', icon: 'i-lucide-file', color: 'gray' },
];

function uploadTypesForAppointment(appointment: any) {
  let list = uploadDocumentTypes;
  if (!appointment || appointment.type !== 'blood_test') {
    list = list.filter((t) => t.value !== 'resultats');
  } else if (!canUploadLabResultatsForAppointmentStatus(appointment.status)) {
    list = list.filter((t) => t.value !== 'resultats');
  }
  return list;
}

function canUploadDocuments(appointment: any) {
  return !!appointment && canUploadMedicalDocumentsForAppointmentStatus(appointment.status);
}

function setAppointmentForUpload(apt: any) {
  currentAppointmentForUpload.value = apt;
}

async function uploadDocumentFile(file: File, docType: string) {
  const appointment = currentAppointmentForUpload.value ?? getAppointmentFromDetailRef(detailRef);
  if (!appointment?.id) {
    toast.add({ title: 'Erreur', description: 'Rendez-vous introuvable. Rechargez la page si le problème persiste.', color: 'error' });
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.add({ title: 'Fichier trop volumineux', description: 'Le fichier dépasse 25 Mo.', color: 'error' });
    return;
  }
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (docType === 'resultats' && file.type !== 'application/pdf') {
    toast.add({ title: 'Format non accepté', description: 'Les résultats doivent être en PDF.', color: 'error' });
    return;
  }
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
    toast.add({ title: 'Erreur', description: e?.message || "Une erreur est survenue", color: 'error' });
  } finally {
    uploadingTypes.value.delete(docType);
  }
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
      throw new Error(err.error || 'Erreur lors du téléchargement');
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
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Téléchargement impossible', color: 'error' });
  } finally {
    downloadingDocId.value = null;
  }
}




// RDV pending offert : rediriger vers la liste avec popup (pas si le lab a créé le RDV)
watch(
  () => getAppointmentFromDetailRef(detailRef),
  (app) => {
    if (app && isPendingIncomingOffer(app, user.value?.id)) {
      navigateTo(`/lab/appointments?openAppointment=${app.id}`);
    }
  },
  { immediate: true },
);
const showRescheduleModal = ref(false);
const canceling = ref(false);
const currentAppointmentForCancel = ref<any>(null);
const currentLoadAppointmentForCancel = ref<(() => Promise<void>) | null>(null);
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
    navigateTo(`/lab/appointments/${newAppointmentId}`);
  } else {
    detailRef.value?.loadAppointment?.();
  }
}

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  const appointment = currentAppointmentForCancel.value;
  const loadAppointment = currentLoadAppointmentForCancel.value;
  if (!appointment?.id || typeof loadAppointment !== 'function') return;
  const appointmentId = String(appointment.id);
  currentAppointmentForCancel.value = null;
  currentLoadAppointmentForCancel.value = null;
  canceling.value = true;
  try {
    const result = await cancelAppointmentWithOptionalPhoto(appointmentId, payload);
    if (result.ok) {
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
