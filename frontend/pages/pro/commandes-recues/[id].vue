<template>
  <PharmacyOrderDetailPage
    :order-id="orderId"
    list-path="/pro/commandes-recues"
    mode="receiver"
    page-title="Commande reçue"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

const route = useRoute();
const orderId = computed(() => String(route.params.id ?? ''));

useHead({ title: 'Détail commande reçue – Pharmacie' });
</script>
