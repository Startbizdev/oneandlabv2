<template>
  <ClientOnly>
    <AppointmentForm mode="create" base-path="/pro" />
    <template #fallback>
      <div class="mb-8 flex items-center gap-2 text-muted">
        <span class="loading loading-spinner loading-sm" />
        <span>Chargement...</span>
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});
</script>
