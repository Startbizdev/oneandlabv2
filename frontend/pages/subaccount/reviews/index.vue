<template>
  <ReceivedReviewsPage appointment-detail-base="/subaccount/appointments" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'subaccount',
});
</script>
