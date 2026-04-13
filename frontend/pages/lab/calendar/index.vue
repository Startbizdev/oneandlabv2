<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Calendrier"
      description="Vue d'ensemble des rendez-vous du laboratoire"
    />
    <CalendarPage base-path="/lab" :show-new-appointment-button="false" />
  </div>
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
