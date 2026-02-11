<template>
  <AppointmentDetailPage base-path="/lab" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});
</script>
