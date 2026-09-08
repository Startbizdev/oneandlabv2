<template>
  <PrescriptionsToolPage role-base="/pro" prescription-kind="nursing" />
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
