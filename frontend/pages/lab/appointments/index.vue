<template>
  <AppointmentListPage
    base-path="/lab"
    title="Rendez-vous du laboratoire"
    subtitle="Prises de sang uniquement — laboratoire et sous-comptes."
    :use-date-filter="false"
  >
    <template #cardActions="{ appointment, basePath }">
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
  role: 'lab',
});

useHead({
  title: 'Rendez-vous – Laboratoire',
});
</script>
