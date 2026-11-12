<template>
  <PharmacyOrderDetailPage
    :order-id="String(route.params.id)"
    list-path="/patient/traitements"
    mode="patient"
    page-title="Détail de la commande"
  />
</template>

<script setup lang="ts">
const route = useRoute();

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'patient',
});
</script>
