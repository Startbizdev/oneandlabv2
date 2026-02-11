<template>
  <CalendarPage base-path="/lab" />
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
