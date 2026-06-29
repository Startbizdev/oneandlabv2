<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role'],
  role: 'pro',
})
</script>

<template>
  <TutorialCarousel role="pro" />
</template>
