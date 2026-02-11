<template>
  <div class="min-h-full">
    <AppointmentListPage
      ref="listRef"
      base-path="/subaccount"
      title="Rendez-vous"
      subtitle="Rendez-vous assignés à ce sous-compte. Assignez un préleveur pour les prendre en charge."
      empty-title="Aucun rendez-vous"
      empty-description="Aucun rendez-vous n'est assigné à ce sous-compte. Les nouveaux rendez-vous apparaîtront ici."
    >
      <template #cardActions="{ appointment, basePath }">
        <UButton
          variant="outline"
          size="sm"
          leading-icon="i-lucide-eye"
          :to="`${basePath}/appointments/${appointment.id}`"
        >
          Détails
        </UButton>
        <UButton
          variant="outline"
          size="sm"
          leading-icon="i-lucide-user-plus"
          @click="openAssignModal(appointment)"
        >
          Assigner
        </UButton>
      </template>
    </AppointmentListPage>

    <!-- Modal assign préleveur -->
    <UModal v-model="showAssignModal">
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Assigner un préleveur</h2>
        </template>

        <div class="space-y-4">
          <UFormGroup label="Sélectionner un préleveur">
            <USelect v-model="selectedPreleveur" :items="preleveurOptions" placeholder="Choisir..." />
          </UFormGroup>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showAssignModal = false">Annuler</UButton>
            <UButton @click="assignPreleveur" :loading="assigning">Assigner</UButton>
          </div>
        </div>
      </UCard>
    </UModal>
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
const listRef = ref<{ fetchAppointments: () => void } | null>(null);

const showAssignModal = ref(false);
const selectedPreleveur = ref('');
const currentAppointment = ref<any>(null);
const assigning = ref(false);
const preleveurs = ref<any[]>([]);
const preleveurOptions = computed(() =>
  preleveurs.value.map((p) => ({
    label: `${p.first_name} ${p.last_name}`,
    value: p.id,
  }))
);

function openAssignModal(appointment: any) {
  currentAppointment.value = appointment;
  selectedPreleveur.value = appointment.assigned_to || '';
  showAssignModal.value = true;
}

async function assignPreleveur() {
  if (!selectedPreleveur.value || !currentAppointment.value) return;

  assigning.value = true;
  const toast = useToast();

  try {
    await apiFetch(`/appointments/${currentAppointment.value.id}`, {
      method: 'PUT',
      body: { assigned_to: selectedPreleveur.value },
    });

    toast.add({ title: 'Préleveur assigné', color: 'green' });
    showAssignModal.value = false;
    await listRef.value?.fetchAppointments?.();
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message, color: 'red' });
  } finally {
    assigning.value = false;
  }
}

onMounted(async () => {
  try {
    const response = await apiFetch(
      `/users?role=preleveur&lab_id=${user.value?.lab_id || user.value?.id}`,
      { method: 'GET' }
    );
    if (response.success && response.data) {
      preleveurs.value = response.data;
    }
  } catch (error) {
    console.error('Erreur chargement préleveurs:', error);
  }
});
</script>
