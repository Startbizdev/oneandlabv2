<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Calendrier"
      description="Vue d'ensemble des rendez-vous du sous-compte"
    />
    <CalendarPage base-path="/subaccount" />
  </div>
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
