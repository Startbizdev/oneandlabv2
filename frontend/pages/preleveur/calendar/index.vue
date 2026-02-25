<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Mon calendrier"
      description="Vue d'ensemble de vos rendez-vous"
    />
    <CalendarPage base-path="/preleveur" :show-new-appointment-button="false" />
  </div>
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
