<template>
  <LabResultsListPage
    role="patient"
    appointment-base-path="/patient/appointments"
    layout-bleed="patient"
    title="Résultats"
    description="Consultez et téléchargez vos résultats d’analyses déposés par le laboratoire."
    empty-description="Vos résultats apparaîtront ici dès que le laboratoire les aura mis en ligne."
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});
</script>
