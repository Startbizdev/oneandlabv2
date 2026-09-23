<template>
  <PharmacyOrderListPage
    role-base="/nurse/commandes-pharmacie"
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
  role: 'nurse',
});

useHead({ title: 'Commandes pharmacie – Infirmier' });
</script>
