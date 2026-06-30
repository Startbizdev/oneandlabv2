<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Mon calendrier"
        description="Vue d'ensemble de vos rendez-vous"
      />
    </template>
    <CalendarPage base-path="/preleveur" :show-new-appointment-button="false" />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

useHead({
  title: 'Calendrier – Préleveur',
});
</script>
