<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Calendrier"
        description="Vue d'ensemble des rendez-vous du sous-compte"
      />
    </template>
    <CalendarPage base-path="/subaccount" :show-new-appointment-button="false" />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'subaccount',
});

useHead({
  title: 'Calendrier – Sous-compte',
});
</script>
