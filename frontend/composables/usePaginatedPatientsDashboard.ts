import { ref, watch, onMounted, onScopeDispose } from 'vue';
import { fetchPatientsPage } from '~/utils/fetch-all-patients';
import { apiFetch } from '~/utils/api';

const PAGE_LIMIT = 50;

/** Liste patients dashboard (lab / subaccount) — pagination serveur + recherche ≥ 2 car. */
export function usePaginatedPatientsDashboard() {
  const searchQuery = ref('');
  const debouncedQuery = ref('');
  const patients = ref<any[]>([]);
  const loading = ref(true);
  const loadError = ref(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let requestVersion = 0;

  async function fetchPatients() {
    const version = ++requestVersion;
    loading.value = true;
    loadError.value = false;
    try {
      const q = debouncedQuery.value.trim();
      const { data } = await fetchPatientsPage(apiFetch, {
        scope: 'picker',
        page: 1,
        limit: PAGE_LIMIT,
        ...(q.length >= 2 ? { search: q } : {}),
      });
      if (version !== requestVersion) return;
      patients.value = data;
    } catch {
      if (version !== requestVersion) return;
      loadError.value = true;
      patients.value = [];
    } finally {
      if (version === requestVersion) loading.value = false;
    }
  }

  watch(searchQuery, (q) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedQuery.value = q;
    }, 300);
  });

  watch(debouncedQuery, () => {
    void fetchPatients();
  });

  onMounted(() => {
    void fetchPatients();
  });

  onScopeDispose(() => {
    requestVersion++;
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  return {
    searchQuery,
    patients,
    loading,
    loadError,
    fetchPatients,
  };
}
