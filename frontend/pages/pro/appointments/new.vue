<template>
  <ClientOnly>
    <DashboardMultiAppointmentWizard
      base-path="/pro"
      selection-title="Quels soins pour ce rendez-vous ?"
    />
    <template #fallback>
      <div
        class="flex min-h-[min(50vh,22rem)] flex-col items-center justify-center gap-3 py-16"
        role="status"
        aria-live="polite"
      >
        <UIcon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-primary-500" aria-hidden="true" />
        <span class="sr-only">Chargement du formulaire</span>
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

useHead({ title: 'Nouveau rendez-vous – Professionnel' });
</script>
