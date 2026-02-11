<template>
  <AppointmentListPage
    ref="listRef"
    base-path="/nurse"
    title="Mes rendez-vous"
    subtitle="Gérez vos rendez-vous"
    :status-filter-api="'confirmed,inProgress,completed,canceled,refused'"
  >
    <template #cardActions="{ appointment, basePath }">
      <UButton
        v-if="appointment.status === 'inProgress'"
        color="success"
        size="sm"
        leading-icon="i-lucide-check-circle"
        :loading="listRef?.isProcessing?.(appointment.id)"
        @click="completeAppointment(appointment.id)"
        block
      >
        Terminer
      </UButton>
      <UButton
        v-else-if="appointment.status === 'confirmed' && listRef?.canStart?.(appointment)"
        color="primary"
        size="sm"
        leading-icon="i-lucide-play"
        :loading="listRef?.isProcessing?.(appointment.id)"
        @click="startAppointment(appointment.id)"
        block
      >
        Commencer
      </UButton>
      <UButton
        variant="outline"
        size="sm"
        leading-icon="i-lucide-eye"
        :to="`${basePath}/appointments/${appointment.id}`"
        block
      >
        Détails
      </UButton>
    </template>
  </AppointmentListPage>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

import { apiFetch } from '~/utils/api';

const toast = useToast();
const listRef = ref<{ fetchAppointments: () => void; processingAppointments: Set<string>; canStart: (a: any) => boolean } | null>(null);

const startAppointment = async (id: string) => {
  if (!listRef.value) return;
  listRef.value.processingAppointments.add(id);
  try {
    const response = await apiFetch(`/appointments/${id}`, {
      method: 'PUT',
      body: { status: 'inProgress' },
    });
    if (response.success) {
      toast.add({
        title: 'Soin démarré',
        description: 'Le soin a été démarré avec succès.',
        color: 'blue',
      });
      await listRef.value.fetchAppointments();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de démarrer le soin',
        color: 'red',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    listRef.value.processingAppointments.delete(id);
  }
};

const completeAppointment = async (id: string) => {
  if (!listRef.value) return;
  listRef.value.processingAppointments.add(id);
  try {
    const response = await apiFetch(`/appointments/${id}`, {
      method: 'PUT',
      body: { status: 'completed' },
    });
    if (response.success) {
      toast.add({
        title: 'Soin terminé',
        description: 'Le soin a été terminé avec succès.',
        color: 'green',
      });
      await listRef.value.fetchAppointments();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de terminer le soin',
        color: 'red',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    listRef.value.processingAppointments.delete(id);
  }
};
</script>
