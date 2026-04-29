<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Mes rendez-vous"
      description="Toutes vos prises de sang — rendez-vous du laboratoire qui vous concernent."
    />

    <AppointmentListPage
      base-path="/preleveur"
      hide-header
      title="Mes rendez-vous"
      subtitle="Liste complète de vos missions (toutes dates confondues)."
      :use-date-filter="false"
      :card-href="(a) => (pendingIncoming(a) ? null : `/preleveur/appointments/${a.id}`)"
      @card-click="(a) => openAppointmentModal(a.id)"
    />

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
                <UButton color="primary" block :on-click="closeAlreadyAcceptedModal">
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
import { isPendingIncomingOffer } from '~/utils/appointment-offer';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

const route = useRoute();
const { user } = useAuth();
const { openAppointmentModalById: openAppointmentModal } = useAppointmentModal();
const showAlreadyAcceptedModal = ref(false);

function pendingIncoming(appointment: { status?: string; created_by?: string | null }) {
  return isPendingIncomingOffer(appointment, user.value?.id);
}

function closeAlreadyAcceptedModal() {
  showAlreadyAcceptedModal.value = false;
  navigateTo('/preleveur');
}

watch(
  () => route.query.alreadyAccepted,
  (val) => {
    if (val === '1' || val === 'true') showAlreadyAcceptedModal.value = true;
  },
  { immediate: true },
);

useHead({
  title: 'Mes rendez-vous – Préleveur',
});
</script>
