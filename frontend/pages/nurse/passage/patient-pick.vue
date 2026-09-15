<template>
  <AppPageShell class="space-y-5">
    <AppPageHeader title="Pour quel patient ?" description="Choisissez la personne concernée par ce passage." :edge-bleed="false" />
    <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Rechercher un patient…" aria-label="Rechercher un patient pour ce passage" class="w-full" />
    <div v-if="loading" class="py-10 text-center text-sm text-gray-500" role="status">Chargement des patients…</div>
    <UAlert v-else-if="error" color="error" variant="soft" :title="error">
      <template #actions><UButton color="neutral" variant="outline" @click="reload">Réessayer</UButton></template>
    </UAlert>
    <div v-else-if="patients.length" class="rounded-2xl border border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
      <StaffPatientHubList :items="patients" @select="item => goForm(item.patient_id)" />
    </div>
    <UEmpty v-else title="Aucun patient trouvé" description="Essayez un autre nom ou ajoutez un patient à votre espace.">
      <template #actions><UButton to="/profile?newPatient=1" variant="outline">Ajouter un patient</UButton></template>
    </UEmpty>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { StaffHubPatientItem } from '@oneandlab/shared-types';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

useHead({ title: 'Patient – Passage' });

const route = useRoute();
const router = useRouter();
const startDate = computed(() => String(route.query.start_date ?? new Date().toISOString().slice(0, 10)));
const mode = computed(() => (route.query.mode === 'recurring' ? 'recurring' : 'single_day'));

const { searchQuery, items, loading, error, reload } = useStaffPatientHubSearch();
const patients = computed(() => items.value.filter((item): item is StaffHubPatientItem => item.kind === 'patient'));

function goForm(patientId: string) {
  router.push({
    path: '/nurse/passage/new',
    query: {
      patient_id: patientId,
      start_date: startDate.value,
      mode: mode.value,
    },
  });
}
</script>
