<template>
  <PrescriptionsToolPage role-base="/pro" prescription-kind="medical" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

useHead({
  title: 'Ordonnances – Professionnel',
});
</script>
