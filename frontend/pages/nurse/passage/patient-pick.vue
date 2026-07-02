<template>
  <AppPageShell class="space-y-4">
    <AppPageHeader title="Choisir un patient" :edge-bleed="false" />
    <UInput v-model="search" icon="i-lucide-search" placeholder="Rechercher un patient…" />
    <div v-if="loading" class="py-10 text-center text-gray-500">Chargement…</div>
    <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
      <li v-for="item in patients" :key="item.patient_id">
        <button
          type="button"
          class="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
          @click="goForm(item.patient_id)"
        >
          <span class="font-semibold">{{ item.first_name }} {{ item.last_name }}</span>
        </button>
      </li>
    </ul>
    <UEmpty v-if="!loading && patients.length === 0" title="Aucun patient" variant="naked" />
  </AppPageShell>
</template>

<script setup lang="ts">
import { fetchStaffPatientHubSearch } from '~/utils/staff-patient-hub-search';

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

const search = ref('');
const loading = ref(false);
const patients = ref<Array<{ patient_id: string; first_name?: string; last_name?: string }>>([]);

watchDebounced(
  search,
  async () => {
    loading.value = true;
    try {
      const res = await fetchStaffPatientHubSearch(search.value.trim());
      patients.value = (res?.items ?? []).filter((i) => i.kind === 'patient');
    } finally {
      loading.value = false;
    }
  },
  { debounce: 300, immediate: true },
);

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
