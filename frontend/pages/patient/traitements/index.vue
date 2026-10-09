<template>
  <PharmacyOrderListPage
    role-base="/patient/traitements"
    scope="patient"
    title="Mes traitements"
    description="Commandez en pharmacie et suivez vos traitements."
    empty-description="Vos commandes de traitement apparaîtront ici."
    show-new-button
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'patient',
});
</script>
