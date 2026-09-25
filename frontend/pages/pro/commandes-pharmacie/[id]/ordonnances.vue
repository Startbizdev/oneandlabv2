<template>
  <PharmacyOrderPrescriptionsPage :order-id="orderId" list-path="/pro/commandes-pharmacie" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

const route = useRoute();
const orderId = computed(() => String(route.params.id ?? ''));

useHead({ title: 'Ordonnances – Commande pharmacie' });
</script>
