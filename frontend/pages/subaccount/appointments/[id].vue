<template>
  <div>
    <AppointmentDetailPage ref="detailRef" base-path="/subaccount">
      <template #documentsCard="{ appointment, documents, documentsLoading, loadDocuments }">
        <div v-if="documentsLoading" class="flex items-center justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary-500" />
        </div>
        <UEmpty
          v-else-if="!documents?.length"
          icon="i-lucide-file-x"
          title="Aucun document"
          description="Aucun document médical n'a été déposé pour ce rendez-vous (ex. par le patient à la prise de RDV)."
          variant="naked"
        />
        <div v-else class="space-y-3">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Documents déposés par le patient ou liés au rendez-vous.
          </p>
          <div
            v-for="doc in documents"
            :key="doc.id"
            class="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <UIcon name="i-lucide-file" class="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ doc.file_name }}</span>
              <UBadge v-if="doc.source === 'patient_profile'" color="info" variant="soft" size="xs">
                Compte patient
              </UBadge>
              <UBadge v-else-if="doc.document_type" color="neutral" variant="soft" size="xs">
                {{ getDocumentTypeLabel(doc.document_type) }}
              </UBadge>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-download"
              :loading="downloadingDocId === doc.id"
              :loading-auto="false"
              aria-label="Télécharger"
              @click="downloadDocument(doc)"
            />
          </div>
        </div>
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
            <p v-if="currentAssignmentLabel" class="text-xs text-gray-500 dark:text-gray-400">
              Actuel : {{ currentAssignmentLabel }}
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
              />
              <UButton
                type="button"
                color="primary"
                variant="soft"
                size="sm"
                :loading="reassigning"
                :disabled="!reassignValue || reassignValue === currentAssignmentValue"
                block
                @click="applyReassign(appointment, loadAppointment)"
              >
                Appliquer
              </UButton>
            </div>
          </div>
          <UButton
            v-if="appointment && appointment.status !== 'canceled' && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
            type="button"
            color="success"
            variant="soft"
            size="lg"
            leading-icon="i-lucide-check-circle"
            :loading="completing"
            block
            @click="completeAppointment"
          >
            Terminer le RDV
          </UButton>
          <UButton
            v-if="appointment && appointment.status !== 'canceled' && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
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
          <UButton
            v-if="appointment && appointment.status !== 'canceled' && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
            type="button"
            color="error"
            variant="soft"
            size="md"
            leading-icon="i-lucide-x-circle"
            :loading="canceling"
            block
            @click="showCancelModal = true"
          >
            Annuler le rendez-vous
          </UButton>
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

import { apiFetch } from '~/utils/api';

const { user } = useAuth();
const toast = useAppToast();
const config = useRuntimeConfig();
const detailRef = ref<{ loadAppointment: () => Promise<void>; appointment: { value: any } } | null>(null);
const downloadingDocId = ref<string | null>(null);

function getDocumentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    carte_vitale: 'Carte Vitale',
    carte_mutuelle: 'Carte Mutuelle',
    ordonnance: 'Ordonnance',
    autres_assurances: 'Autres Assurances',
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

// RDV pending non assigné : rediriger vers la liste avec popup accepter/refuser (comme lab / infirmiers)
watch(
  () => detailRef.value?.appointment?.value,
  (app) => {
    if (app?.status === 'pending' && !app?.assigned_lab_id) {
      navigateTo(`/subaccount/appointments?openAppointment=${app.id}`);
    }
  },
  { immediate: true },
);

const showCancelModal = ref(false);
const showRescheduleModal = ref(false);
const completing = ref(false);
const rescheduleAppointment = ref<any>(null);

function completeAppointment() {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
  completing.value = true;
  apiFetch(`/appointments/${appointment.id}`, { method: 'PUT', body: { status: 'completed' } })
    .then((response) => {
      if (response.success) {
        toast.add({ title: 'RDV terminé', description: 'Le rendez-vous a été marqué comme terminé.', color: 'success' });
        detailRef.value?.loadAppointment?.();
      } else {
        toast.add({ title: 'Erreur', description: response.error || 'Impossible de terminer le rendez-vous', color: 'error' });
      }
    })
    .catch((error: any) => {
      toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
    })
    .finally(() => { completing.value = false; });
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

const currentAssignmentLabel = computed(() => {
  const app = detailRef.value?.appointment?.value;
  if (!app) return '';
  const parts: string[] = [];
  if (app.assigned_lab_display_name) {
    const role = app.assigned_lab_role === 'subaccount' ? 'Sous-compte' : 'Laboratoire';
    parts.push(`${role} : ${app.assigned_lab_display_name}`);
  }
  if (app.assigned_to_display_name) parts.push(`Préleveur : ${app.assigned_to_display_name}`);
  return parts.length ? parts.join(' · ') : 'Non assigné';
});

const currentAssignmentValue = computed(() => {
  const app = detailRef.value?.appointment?.value;
  if (!app) return '';
  if (app.assigned_to) return `prel:${app.assigned_to}`;
  if (app.assigned_lab_id) return app.assigned_lab_id === myId.value ? `sub:${app.assigned_lab_id}` : `sub:${app.assigned_lab_id}`;
  return '';
});

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
  () => detailRef.value?.appointment?.value,
  (app) => {
    if (app?.type === 'blood_test' && ['pending', 'confirmed', 'inProgress'].includes(app?.status)) {
      fetchAssignmentOptions();
      reassignValue.value = currentAssignmentValue.value;
    }
  },
  { immediate: true },
);

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment) return;
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
      await detailRef.value?.loadAppointment?.();
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
