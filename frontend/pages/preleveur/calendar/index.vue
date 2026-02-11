<template>
  <CalendarPage base-path="/preleveur" title="Mon calendrier" />
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
