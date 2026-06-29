<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: ['auth', 'role'],
  role: 'nurse',
})
</script>

<template>
  <TutorialCarousel role="nurse" />
</template>
