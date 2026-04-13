<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

await navigateTo('/nurse/appointments', { replace: true });
</script>

<template>
  <div />
</template>
