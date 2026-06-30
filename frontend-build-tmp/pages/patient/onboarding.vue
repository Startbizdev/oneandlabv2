<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role'],
  role: 'patient',
})
</script>

<template>
  <OnboardingTutorialCarousel role="patient" />
</template>
