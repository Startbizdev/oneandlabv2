<template>
  <PharmacyOrderMessagesPage :order-id="orderId" list-path="/admin/commandes-pharmacie" mode="admin" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

const route = useRoute();
const orderId = computed(() => String(route.params.id ?? ''));

useHead({ title: 'Messages commande pharmacie – Administration' });
</script>
