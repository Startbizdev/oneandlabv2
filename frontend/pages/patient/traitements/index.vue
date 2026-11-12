<template>
  <PharmacyOrderListPage
    role-base="/patient/traitements"
    scope="patient"
    title="Mes commandes pharmacie"
    description="Commandez en pharmacie et suivez vos commandes."
    empty-description="Vos commandes pharmacie apparaîtront ici."
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
