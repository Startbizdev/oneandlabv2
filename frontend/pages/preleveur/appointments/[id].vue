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
          <template v-if="appointment && ['pending', 'confirmed', 'inProgress'].includes(appointment.status)">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 px-0.5">
              Clôturer le rendez-vous
            </p>
            <UButton
              type="button"
              color="success"
              variant="solid"
              size="lg"
              leading-icon="i-lucide-check-circle"
              :loading="completing"
              block
              :on-click="() => completeAppointment(appointment, loadAppointment)"
            >
              Terminer le RDV
            </UButton>
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

const route = useRoute();
const toast = useAppToast();
const detailRef = ref<{ loadAppointment: () => Promise<void>; appointment: { value: any } } | null>(null);
const showCancelModal = ref(false);
const currentAppointmentForCancel = ref<any>(null);
const currentLoadAppointmentForCancel = ref<(() => Promise<void>) | null>(null);
const showRescheduleModal = ref(false);
const canceling = ref(false);
const completing = ref(false);
const rescheduleAppointment = ref<any>(null);

function completeAppointment(apt: any, loadAppointment: () => Promise<void>) {
  if (!apt) return;
  completing.value = true;
  apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body: { status: 'completed' } })
    .then((response) => {
      if (response.success) {
        toast.add({ title: 'RDV terminé', description: 'Le rendez-vous a été marqué comme terminé.', color: 'success' });
        loadAppointment();
      } else {
        toast.add({ title: 'Erreur', description: response.error || 'Impossible de terminer le rendez-vous', color: 'error' });
      }
    })
    .catch((error: any) => toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' }))
    .finally(() => { completing.value = false; });
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
