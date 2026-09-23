<template>
  <PharmacyOrderDetailPage
    :order-id="orderId"
    list-path="/pro/commandes-pharmacie"
    mode="requester"
    page-title="Commande pharmacie"
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

useHead({ title: 'Détail commande pharmacie – Professionnel' });
</script>
