<template>
  <PharmacyOrderMessagesPage :order-id="orderId" list-path="/patient/traitements" mode="patient" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const orderId = computed(() => String(route.params.id ?? ''));

useHead({ title: 'Messages – Traitement' });
</script>
