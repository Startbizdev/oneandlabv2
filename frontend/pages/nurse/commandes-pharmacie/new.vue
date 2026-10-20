<template>
  <AppPageShell max-width="5xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Nouvelle commande pharmacie"
        description="Transmettez une ordonnance à une pharmacie partenaire."
      >
        <template #actions>
          <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" to="/nurse/commandes-pharmacie">
            Retour
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <PharmacyOrderCreateForm
      role-base="/nurse/commandes-pharmacie"
      :initial-patient-id="typeof route.query.patient_id === 'string' ? route.query.patient_id : undefined"
      :initial-pharmacy-id="pharmacyId"
      :utm-qr="utmQr"
    />
  </AppPageShell>
</template>

<script setup lang="ts">
import { isPharmacyId } from '~/utils/qr-redirect';

const route = useRoute();
const pharmacyId = computed(() => (isPharmacyId(route.query.pharmacy_id) ? route.query.pharmacy_id : undefined));
const utmQr = computed(() => (typeof route.query.utm_qr === 'string' && route.query.utm_qr.trim() ? route.query.utm_qr.trim() : undefined));

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

useHead({ title: 'Nouvelle commande pharmacie – Infirmier' });
</script>
