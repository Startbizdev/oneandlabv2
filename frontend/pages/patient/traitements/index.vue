<template>
  <PharmacyOrderListPage
    role-base="/patient/traitements"
    scope="patient"
    title="Mes traitements"
    description="Suivez les traitements préparés pour vous."
    empty-description="Vos commandes de traitement apparaîtront ici."
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'patient',
});
</script>
