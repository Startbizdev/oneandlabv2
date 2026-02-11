<template>
  <AppointmentForm mode="edit" :appointment-id="(route.params.id as string)" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

const route = useRoute();
</script>
