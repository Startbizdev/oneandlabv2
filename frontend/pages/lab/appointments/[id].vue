<template>
  <AppointmentDetailPage ref="detailRef" base-path="/lab">
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
          <div class="flex flex-col gap-3">
            <UButton
              v-if="appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
              type="button"
              color="success"
              variant="soft"
              size="lg"
              leading-icon="i-lucide-check-circle"
              :loading="completing"
              block
              @click="completeAppointment(appointment, loadAppointment)"
            >
              Terminer le RDV
            </UButton>
            <UButton
              v-if="appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
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
              v-if="appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
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
      </div>
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
import { apiFetch } from '~/utils/api';

const toast = useAppToast();
const config = useRuntimeConfig();
const route = useRoute();
const detailRef = ref<{ loadAppointment: () => Promise<void>; loadDocuments?: () => Promise<void>; appointment: { value: any } } | null>(null);
const showCancelModal = ref(false);
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




// RDV pending non assigné : rediriger vers la liste avec popup accepter/refuser (comme les infirmiers)
watch(
  () => detailRef.value?.appointment?.value,
  (app) => {
    if (app?.status === 'pending' && !app?.assigned_lab_id) {
      navigateTo(`/lab/appointments?openAppointment=${app.id}`);
    }
  },
  { immediate: true },
);
const showRescheduleModal = ref(false);
const canceling = ref(false);
const completing = ref(false);
const rescheduleAppointment = ref<any>(null);

function completeAppointment(apt?: any, loadAppointmentFn?: () => Promise<void>) {
  const appointment = apt ?? detailRef.value?.appointment?.value;
  if (!appointment?.id) {
    toast.add({ title: 'Erreur', description: 'Rendez-vous introuvable.', color: 'error' });
    return;
  }
  completing.value = true;
  apiFetch(`/appointments/${appointment.id}`, { method: 'PUT', body: { status: 'completed' } })
    .then((response) => {
      if (response.success) {
        toast.add({ title: 'RDV terminé', description: 'Le rendez-vous a été marqué comme terminé.', color: 'success' });
        (loadAppointmentFn || detailRef.value?.loadAppointment)?.();
      } else {
        toast.add({ title: 'Erreur', description: response.error || 'Impossible de terminer le rendez-vous', color: 'error' });
      }
    })
    .catch((error: any) => toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' }))
    .finally(() => { completing.value = false; });
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
      await detailRef.value?.loadAppointment();
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
