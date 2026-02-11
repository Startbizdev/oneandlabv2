<template>
  <CalendarPage base-path="/subaccount" />
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
