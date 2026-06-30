<template>
  <StaffPatientHubPatientsPage base-path="/pro" page-title="Mes patients – Pro de santé" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});
</script>
