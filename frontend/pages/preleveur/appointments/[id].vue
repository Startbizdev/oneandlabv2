<template>
  <AppointmentDetailPage ref="detailRef" base-path="/preleveur">
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
          <UButton
            v-if="appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
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
            v-if="['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
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
            v-if="appointment.relative?.phone || appointment.form_data?.phone"
            type="button"
            color="info"
            variant="soft"
            size="md"
            leading-icon="i-lucide-message-square"
            block
            @click="openSms"
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
            @click="openWaze"
          >
            Itinéraire Waze
          </UButton>
          <UButton
            v-if="['pending', 'confirmed', 'inProgress'].includes(appointment.status)"
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

const route = useRoute();
const toast = useAppToast();
const detailRef = ref<{ loadAppointment: () => Promise<void>; appointment: { value: any } } | null>(null);
const showCancelModal = ref(false);
const showRescheduleModal = ref(false);
const canceling = ref(false);
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
        detailRef.value?.loadAppointment();
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
    navigateTo(`/preleveur/appointments/${newAppointmentId}`);
  } else {
    detailRef.value?.loadAppointment();
  }
}

function openSms() {
  const appointment = detailRef.value?.appointment?.value;
  const phone = appointment?.relative?.phone || appointment?.form_data?.phone;
  if (!phone) return;
  window.location.href = `sms:${phone.replace(/\s/g, '')}`;
}

function openWaze() {
  const appointment = detailRef.value?.appointment?.value;
  if (!appointment?.address) return;
  const address = appointment.address;
  if (typeof address === 'object' && address.lat != null && address.lng != null) {
    window.open(`https://waze.com/ul?ll=${address.lat},${address.lng}&navigate=yes`, '_blank');
  } else {
    const text = typeof address === 'object' && address.label ? address.label : String(address);
    window.open(`https://waze.com/ul?q=${encodeURIComponent(text)}&navigate=yes`, '_blank');
  }
}

async function onConfirmCancel(payload: { reason: string; comment: string; photoFile: File | null }) {
  // Récupérer l'appointment : ref exposée peut être .value ou déjà déballée selon le contexte
  const appointmentData = detailRef.value?.appointment?.value ?? detailRef.value?.appointment;
  const loadAppointment = detailRef.value?.loadAppointment;
  const appointmentId = appointmentData?.id ?? route.params?.id;
  if (!appointmentId || typeof loadAppointment !== 'function') {
    console.warn('[preleveur] onConfirmCancel early return: missing appointment id or loadAppointment', { appointmentId, hasLoadAppointment: typeof loadAppointment === 'function' });
    return;
  }
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
