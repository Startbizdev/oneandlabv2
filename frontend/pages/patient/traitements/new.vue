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

    <PharmacyOrderCreateForm
      role-base="/patient/traitements"
      for-self
      :redirect-to-list="false"
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
  role: 'patient',
});

useHead({ title: 'Commander en pharmacie' });
</script>
