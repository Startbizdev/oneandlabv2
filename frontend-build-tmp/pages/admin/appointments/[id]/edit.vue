<template>
  <ClientOnly>
    <AdminAppointmentEditPage :appointment-id="String(route.params.id || '')" />
    <template #fallback>
      <div
        class="flex min-h-[min(40vh,18rem)] flex-col items-center justify-center gap-3 py-16"
        role="status"
        aria-live="polite"
      >
        <UIcon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-primary-500" aria-hidden="true" />
        <span class="sr-only">Chargement</span>
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

const route = useRoute();
useHead({ title: 'Modifier un rendez-vous – Administration' });
</script>
