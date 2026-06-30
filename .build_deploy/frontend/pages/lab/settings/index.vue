<template>
  <div class="flex items-center justify-center py-16">
    <p class="text-sm text-muted">Redirection vers le profil...</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['lab', 'subaccount'],
});

// Tout est dans /profile maintenant
await navigateTo('/profile', { replace: true });
</script>
