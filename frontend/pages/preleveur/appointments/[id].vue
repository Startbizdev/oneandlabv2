<template>
  <AppointmentDetailPage base-path="/preleveur" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});
</script>
