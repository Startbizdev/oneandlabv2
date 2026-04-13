<template>
  <PrescriptionsToolPage role-base="/pro" />
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
