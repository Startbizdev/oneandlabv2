<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Mes rendez-vous"
      description="Gérez vos rendez-vous"
    />

    <!-- Compteur offre Découverte : X / 10 RDV ce mois -->
    <UCard v-if="planLimits && planLimits.plan_slug === 'discovery' && planLimits.max_appointments_per_month != null" class="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
            Rendez-vous ce mois (offre Découverte)
          </p>
          <p class="mt-1 text-sm text-amber-700 dark:text-amber-300">
            <span class="font-semibold tabular-nums">{{ planLimits.appointments_count_this_month ?? 0 }}</span>
            / {{ planLimits.max_appointments_per_month }} utilisés — le compteur repart à zéro le 1er de chaque mois.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <p v-if="(planLimits.appointments_count_this_month ?? 0) >= planLimits.max_appointments_per_month" class="text-sm font-medium text-amber-700 dark:text-amber-300">
            Limite atteinte ce mois.
          </p>
          <UButton to="/nurse/abonnement" color="primary" size="md">
            Passez en Pro pour des rendez-vous illimités
          </UButton>
        </div>
      </div>
    </UCard>

    <AppointmentListPage
      ref="listRef"
      base-path="/nurse"
      hide-header
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

  <!-- Modal RDV déjà accepté par un confrère -->
  <ClientOnly>
    <Teleport to="body">
      <UModal v-model:open="showAlreadyAcceptedModal" :ui="{ content: 'max-w-md w-full' }">
        <template #content>
          <UCard class="w-full border-0">
            <div class="p-4 text-center space-y-4">
              <p class="text-lg text-gray-700 dark:text-gray-300">
                Ce RDV a déjà été accepté par un confrère 😢 D'autres arrivent !
              </p>
              <UButton color="primary" block @click="closeAlreadyAcceptedModal">
                Voir mes rendez-vous
              </UButton>
            </div>
          </UCard>
        </template>
      </UModal>
    </Teleport>
  </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

import { apiFetch } from '~/utils/api';

const route = useRoute();
const toast = useAppToast();
const listRef = ref<{ fetchAppointments: () => void; processingAppointments: Set<string>; canStart: (a: any) => boolean } | null>(null);

const planLimits = ref<{ plan_slug?: string; max_appointments_per_month?: number | null; appointments_count_this_month?: number } | null>(null);
const showAlreadyAcceptedModal = ref(false);

function closeAlreadyAcceptedModal() {
  showAlreadyAcceptedModal.value = false;
  navigateTo('/nurse/appointments');
}

watch(
  () => route.query.alreadyAccepted,
  (val) => {
    if (val === '1' || val === 'true') showAlreadyAcceptedModal.value = true;
  },
  { immediate: true },
);

onMounted(async () => {
  try {
    const res = await apiFetch('/plan-limits', { method: 'GET' });
    if (res?.success && res?.data) planLimits.value = res.data;
  } catch {
    planLimits.value = null;
  }
});

const startAppointment = async (id: string) => {
  if (!listRef.value) return;
  listRef.value.processingAppointments.add(id);
  try {
    const response = await apiFetch(`/appointments/${id}`, {
      method: 'PUT',
      body: { status: 'inProgress' },
    });
    if (response.success) {
      const limRes = await apiFetch('/plan-limits', { method: 'GET' });
      if (limRes?.success && limRes?.data) planLimits.value = limRes.data;
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
      const limRes = await apiFetch('/plan-limits', { method: 'GET' });
      if (limRes?.success && limRes?.data) planLimits.value = limRes.data;
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
