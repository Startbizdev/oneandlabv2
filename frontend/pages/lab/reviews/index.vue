<template>
  <ReceivedReviewsPage appointment-detail-base="/lab/appointments" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});
</script>
