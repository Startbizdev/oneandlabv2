<template>
  <AppPageShell max-width="5xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Commander en pharmacie"
        description="Choisissez l’officine, puis envoyez votre ordonnance."
      >
        <template #actions>
          <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" to="/patient/traitements">
            Retour
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <PharmacyOrderCreateForm role-base="/patient/traitements" for-self :redirect-to-list="false" />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'patient',
});

useHead({ title: 'Commander en pharmacie' });
</script>
