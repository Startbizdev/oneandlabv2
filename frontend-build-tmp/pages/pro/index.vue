<script setup lang="ts">
/**
 * L’ancien tableau de bord pro n’est plus utilisé : accueil = liste des RDV.
 */
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
})

await navigateTo('/pro/appointments', { replace: true })
</script>

<template>
  <div class="flex min-h-[30vh] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
    Redirection…
  </div>
</template>
