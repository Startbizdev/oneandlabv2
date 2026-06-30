<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role'],
  role: 'preleveur',
})
</script>

<template>
  <OnboardingTutorialCarousel role="preleveur" />
</template>
