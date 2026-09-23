<template>
  <PharmacyOrderDetailPage
    :order-id="orderId"
    list-path="/admin/commandes-pharmacie"
    mode="admin"
    page-title="Commande pharmacie"
    page-description="Vue administration — lecture seule"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

const route = useRoute();
const orderId = computed(() => String(route.params.id ?? ''));

useHead({ title: 'Détail commande pharmacie – Administration' });
</script>
