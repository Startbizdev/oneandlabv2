<template>
  <ReceivedReviewsPage appointment-detail-base="/nurse/appointments" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});
</script>
