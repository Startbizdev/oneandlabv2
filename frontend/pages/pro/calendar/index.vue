<template>
  <CalendarPage base-path="/pro" title="Mon calendrier" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

useHead({
  title: 'Calendrier – Professionnel',
});
</script>
