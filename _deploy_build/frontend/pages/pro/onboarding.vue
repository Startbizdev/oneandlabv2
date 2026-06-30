<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role'],
  role: 'pro',
})
</script>

<template>
  <OnboardingTutorialCarousel role="pro" />
</template>
