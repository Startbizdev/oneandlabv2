<template>
  <PharmacyOrderMessagesPage :order-id="orderId" list-path="/pro/commandes-recues" mode="receiver" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

const route = useRoute();
const orderId = computed(() => String(route.params.id ?? ''));

useHead({ title: 'Messages – Commande reçue' });
</script>
