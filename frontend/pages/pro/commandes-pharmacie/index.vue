<template>
  <PharmacyOrderListPage
    role-base="/pro/commandes-pharmacie"
    scope="sent"
    title="Commandes pharmacie"
    description="Ordonnances transmises aux pharmacies pour vos patients."
    show-new-button
    empty-description="Créez une commande pour envoyer une ordonnance à une pharmacie."
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

useHead({ title: 'Commandes pharmacie – Professionnel' });
</script>
