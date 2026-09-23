<template>
  <AppPageShell max-width="5xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Nouvelle commande pharmacie"
        description="Créez une commande au nom d'un professionnel (administration)."
      >
        <template #actions>
          <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" to="/admin/commandes-pharmacie">
            Retour
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <PharmacyOrderCreateForm role-base="/admin/commandes-pharmacie" redirect-to-list />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

useHead({ title: 'Nouvelle commande pharmacie – Administration' });
</script>
