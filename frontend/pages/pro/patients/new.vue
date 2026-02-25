<template>
  <div class="flex items-center justify-center py-16">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

// Réutiliser la page profil pour créer un patient
onMounted(() => {
  navigateTo('/profile?newPatient=1', { replace: true });
});
</script>
