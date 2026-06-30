<template>
  <StaffPatientHubPatientsPage base-path="/nurse" page-title="Mes patients – Infirmier" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});
</script>
