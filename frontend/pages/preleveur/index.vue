<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Mes missions assignées"
      description="Prises de sang — rendez-vous qui vous sont assignés."
    />
    <AppointmentListPage
      base-path="/preleveur"
      hide-header
      title="Mes missions assignées"
      subtitle="Prises de sang — rendez-vous qui vous sont assignés."
      :use-date-filter="false"
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
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

const route = useRoute();
const showAlreadyAcceptedModal = ref(false);

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
  title: 'Mes missions – Préleveur',
});
</script>
