<template>
  <PharmacyOrderDetailPage
    :order-id="orderId"
    list-path="/nurse/commandes-pharmacie"
    mode="requester"
    page-title="Commande pharmacie"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

const route = useRoute();
const orderId = computed(() => String(route.params.id ?? ''));

useHead({ title: 'Détail commande pharmacie – Infirmier' });
</script>
