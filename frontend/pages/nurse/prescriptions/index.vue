<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});
</script>

<template>
  <PrescriptionsToolPage role-base="/nurse" prescription-kind="nursing" />
</template>
