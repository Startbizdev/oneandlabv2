<template>
  <PharmacyOrderListPage
    role-base="/pro/commandes-recues"
    scope="received"
    title="Commandes reçues"
    description="Ordonnances transmises par les professionnels de santé."
    empty-title="Aucune commande reçue"
    empty-description="Les demandes adressées à votre pharmacie apparaîtront ici."
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

useHead({ title: 'Commandes reçues – Pharmacie' });
</script>
