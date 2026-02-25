<template>
  <AppointmentDetailPage ref="detailRef" base-path="/pro">
    <template #sidebarActions="{ appointment, loadAppointment }">
      <div class="flex flex-col gap-3">
        <UEmpty
          v-if="appointment && appointment.status === 'canceled'"
          icon="i-lucide-calendar-x"
          title="Rendez-vous annulé"
          description="Ce rendez-vous a été annulé. Vous pouvez créer un nouveau RDV pour ce patient depuis la liste."
          variant="naked"
          size="md"
        />
        <template v-else>
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
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

import { apiFetch } from '~/utils/api';

const route = useRoute();
const toast = useAppToast();
const detailRef = ref<{ loadAppointment: () => Promise<void>; appointment: { value: any } } | null>(null);
const showCancelModal = ref(false);
const showRescheduleModal = ref(false);
const canceling = ref(false);
const rescheduleAppointment = ref<any>(null);

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
  const appointmentData = detailRef.value?.appointment?.value ?? detailRef.value?.appointment;
  const loadAppointment = detailRef.value?.loadAppointment;
  const appointmentId = appointmentData?.id ?? route.params?.id;
  if (!appointmentId || typeof loadAppointment !== 'function') return;
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
      toast.add({ title: 'Rendez-vous annulé', description: "L'annulation a été enregistrée.", color: 'success' });
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
