<template>
  <div class="space-y-6 min-h-full">
    <TitleDashboard
      title="Rendez-vous"
      description="Rendez-vous assignés à ce sous-compte. Assignez un préleveur pour les prendre en charge."
    />
    <AppointmentListPage
      ref="listRef"
      base-path="/subaccount"
      hide-header
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
          <h2 class="text-xl font-normal">Assigner un préleveur</h2>
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
  role: 'subaccount',
});

import { apiFetch } from '~/utils/api';

const route = useRoute();
const { user } = useAuth();
const listRef = ref<{ fetchAppointments: () => void } | null>(null);

const showAssignModal = ref(false);
const showAlreadyAcceptedModal = ref(false);

function closeAlreadyAcceptedModal() {
  showAlreadyAcceptedModal.value = false;
  navigateTo('/subaccount/appointments');
}

watch(
  () => route.query.alreadyAccepted,
  (val) => {
    if (val === '1' || val === 'true') showAlreadyAcceptedModal.value = true;
  },
  { immediate: true },
);
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
  const toast = useAppToast();

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
