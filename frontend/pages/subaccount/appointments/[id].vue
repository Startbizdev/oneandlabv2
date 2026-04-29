<template>
  <div>
    <AppointmentDetailPage ref="detailRef" base-path="/subaccount">
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
        <div class="flex flex-col gap-3">
          <!-- Assignation optionnelle : préleveur ou garder le RDV sur le sous-compte -->
          <div
            v-if="appointment && appointment.type === 'blood_test' && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
            class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
          >
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              Assignation
            </p>
            <p v-if="getCurrentAssignmentLabel(appointment)" class="text-xs text-gray-500 dark:text-gray-400">
              Actuel : {{ getCurrentAssignmentLabel(appointment) }}
            </p>
            <div class="flex flex-col gap-2">
              <USelectMenu
                v-model="reassignValue"
                :items="assignmentSelectItems"
                value-key="value"
                placeholder="Assigner à..."
                size="md"
                class="w-full min-w-0"
                :loading="assignmentOptionsLoading"
                :search-input="{ placeholder: 'Rechercher...' }"
                :filter-fields="['label']"
              >
                <template #empty>
                  <div class="py-6 px-4">
                    <UEmpty
                      icon="i-lucide-user-check"
                      title="Aucun résultat"
                      description="Aucun préleveur ne correspond à votre recherche."
                      variant="naked"
                      size="sm"
                    />
                  </div>
                </template>
              </USelectMenu>
              <UButton
                type="button"
                color="primary"
                variant="solid"
                size="sm"
                :loading="reassigning"
                :disabled="!reassignValue || reassignValue === getCurrentAssignmentValue(appointment)"
                block
                :on-click="() => applyReassign(appointment, loadAppointment)"
              >
                Appliquer
              </UButton>
            </div>
          </div>
          <template v-if="appointment && appointment.status !== 'canceled' && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)">
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
        </div>
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'subaccount',
});

import { getAppointmentFromDetailRef } from '~/composables/useAppointmentDetailRef';
import { apiFetch } from '~/utils/api';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';

const { user } = useAuth();
const toast = useAppToast();
const config = useRuntimeConfig();
const detailRef = ref<{
  loadAppointment: () => Promise<void>;
  loadDocuments?: () => Promise<void>;
  appointment: unknown;
} | null>(null);
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
  if (!appointment || appointment.type !== 'blood_test') {
    return uploadDocumentTypes.filter((t) => t.value !== 'resultats');
  }
  return uploadDocumentTypes;
}

function canUploadDocuments(appointment: any) {
  return appointment && ['confirmed', 'inProgress', 'completed'].includes(appointment?.status);
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
    toast.add({ title: 'Erreur', description: e?.message || 'Une erreur est survenue', color: 'error' });
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

// RDV pending offert : rediriger vers la liste avec popup (pas si le sous-compte a créé le RDV)
watch(
  () => getAppointmentFromDetailRef(detailRef),
  (app) => {
    if (app && isPendingIncomingOffer(app, user.value?.id)) {
      navigateTo(`/subaccount/appointments?openAppointment=${app.id}`);
    }
  },
  { immediate: true },
);

const showCancelModal = ref(false);
const showRescheduleModal = ref(false);
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
    navigateTo(`/subaccount/appointments/${newAppointmentId}`);
  } else {
    detailRef.value?.loadAppointment?.();
  }
}
const canceling = ref(false);
const preleveurs = ref<any[]>([]);
const assignmentOptionsLoading = ref(false);
const reassignValue = ref<string>('');
const reassigning = ref(false);

const myId = computed(() => user.value?.id ?? user.value?.user_id ?? '');

const assignmentSelectItems = computed(() => {
  const items: { value: string; label: string }[] = [];
  if (!myId.value) return items;
  items.push({ value: `sub:${myId.value}`, label: 'Sous-compte (moi)' });
  for (const p of preleveurs.value) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id;
    items.push({ value: `prel:${p.id}`, label: `Préleveur : ${name}` });
  }
  return items;
});

function getCurrentAssignmentLabel(app: any) {
  if (!app) return '';
  const parts: string[] = [];
  if (app.assigned_lab_display_name) {
    const role = app.assigned_lab_role === 'subaccount' ? 'Sous-compte' : 'Laboratoire';
    parts.push(`${role} : ${app.assigned_lab_display_name}`);
  }
  if (app.assigned_to_display_name) parts.push(`Préleveur : ${app.assigned_to_display_name}`);
  return parts.length ? parts.join(' · ') : 'Non assigné';
}

function getCurrentAssignmentValue(app: any) {
  if (!app) return '';
  if (app.assigned_to) return `prel:${app.assigned_to}`;
  if (app.assigned_lab_id) return `sub:${app.assigned_lab_id}`;
  return '';
}

async function fetchAssignmentOptions() {
  assignmentOptionsLoading.value = true;
  try {
    const prelRes = await apiFetch('/lab/preleveurs', { method: 'GET' });
    preleveurs.value = prelRes?.data ?? [];
  } catch {
    preleveurs.value = [];
  } finally {
    assignmentOptionsLoading.value = false;
  }
}

function applyReassign(appointment: any, loadAppointment: () => Promise<void>) {
  if (!appointment?.id || !reassignValue.value) return;
  const [kind, id] = reassignValue.value.split(':');
  if (!id) return;
  reassigning.value = true;
  const body = kind === 'prel' ? { assigned_to: id } : { assigned_lab_id: id };
  apiFetch(`/appointments/${appointment.id}/reassign`, { method: 'POST', body })
    .then(async (res) => {
      if (res?.success) {
        toast.add({ title: 'Assignation mise à jour', color: 'green' });
        reassignValue.value = '';
        await loadAppointment();
      } else {
        toast.add({ title: 'Erreur', description: res?.error || 'Impossible de réassigner', color: 'error' });
      }
    })
    .catch((err: any) => toast.add({ title: 'Erreur', description: err?.message || 'Une erreur est survenue', color: 'error' }))
    .finally(() => { reassigning.value = false; });
}

watch(
  () => getAppointmentFromDetailRef(detailRef),
  (app) => {
    if (app?.type === 'blood_test' && ['pending', 'confirmed', 'inProgress'].includes(app?.status)) {
      fetchAssignmentOptions();
      reassignValue.value = getCurrentAssignmentValue(app);
    }
  },
  { immediate: true },
);

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  const appointment = currentAppointmentForCancel.value;
  const loadAppointment = currentLoadAppointmentForCancel.value;
  if (!appointment || typeof loadAppointment !== 'function') return;
  currentAppointmentForCancel.value = null;
  currentLoadAppointmentForCancel.value = null;
  canceling.value = true;
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
