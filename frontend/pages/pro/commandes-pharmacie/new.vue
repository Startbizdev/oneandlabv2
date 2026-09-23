<template>
  <AppPageShell max-width="5xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Nouvelle commande pharmacie"
        description="Transmettez une ordonnance à une pharmacie partenaire."
      >
        <template #actions>
          <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" to="/pro/commandes-pharmacie">
            Retour
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <PharmacyOrderCreateForm
      role-base="/pro/commandes-pharmacie"
      :initial-patient-id="typeof route.query.patient_id === 'string' ? route.query.patient_id : undefined"
    />
  </AppPageShell>
</template>

<script setup lang="ts">
const route = useRoute();

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'pro',
});

useHead({ title: 'Nouvelle commande pharmacie – Professionnel' });
</script>
