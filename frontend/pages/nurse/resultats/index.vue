<template>
  <LabResultsListPage
    role="nurse"
    appointment-base-path="/nurse/appointments"
    title="Résultats"
    description="Résultats d’analyses déposés par les laboratoires pour vos patients."
    empty-description="Les résultats déposés par les laboratoires pour vos patients s’afficheront ici."
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});
</script>
