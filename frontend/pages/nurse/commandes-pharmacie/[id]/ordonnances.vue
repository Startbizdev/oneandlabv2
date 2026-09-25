<template>
  <PharmacyOrderPrescriptionsPage :order-id="orderId" list-path="/nurse/commandes-pharmacie" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

const route = useRoute();
const orderId = computed(() => String(route.params.id ?? ''));

useHead({ title: 'Ordonnances – Commande pharmacie' });
</script>
