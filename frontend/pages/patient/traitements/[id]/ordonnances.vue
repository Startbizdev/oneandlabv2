<template>
  <PharmacyOrderPrescriptionsPage :order-id="orderId" list-path="/patient/traitements" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const orderId = computed(() => String(route.params.id ?? ''));

useHead({ title: 'Ordonnances – Traitement' });
</script>
