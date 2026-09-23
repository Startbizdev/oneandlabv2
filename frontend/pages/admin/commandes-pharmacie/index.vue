<template>
  <PharmacyOrderListPage
    role-base="/admin/commandes-pharmacie"
    scope="all"
    stats-variant="admin"
    title="Commandes pharmacie"
    description="Vue globale des ordonnances transmises aux pharmacies partenaires."
    show-new-button
    empty-description="Les commandes pharmacie apparaîtront ici."
  >
    <template #headerActions>
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-settings"
        to="/admin/commandes-pharmacie/parametres"
      >
        Paramètres
      </UButton>
    </template>
  </PharmacyOrderListPage>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

useHead({ title: 'Commandes pharmacie – Administration' });
</script>
