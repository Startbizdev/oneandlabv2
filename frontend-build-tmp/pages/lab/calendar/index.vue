<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Calendrier"
        description="Vue d'ensemble des rendez-vous du laboratoire"
      />
    </template>
    <CalendarPage base-path="/lab" :show-new-appointment-button="false" />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});

useHead({
  title: 'Calendrier – Laboratoire',
});
</script>
