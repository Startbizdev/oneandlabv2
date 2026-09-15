import { ref, watch, onScopeDispose } from 'vue';
import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import { fetchStaffPatientHubSearch } from '~/utils/staff-patient-hub-search';

export function useStaffPatientHubSearch() {
  const searchQuery = ref('');
  const debouncedQuery = ref('');
  const items = ref<StaffHubSearchItem[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let requestVersion = 0;
  let controller: AbortController | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    searchQuery,
    (q) => {
      requestVersion++;
      controller?.abort();
      loading.value = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (debouncedQuery.value === q) void load();
        else debouncedQuery.value = q;
      }, 220);
    },
  );

  async function load() {
    const version = ++requestVersion;
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchStaffPatientHubSearch(debouncedQuery.value, 50, controller.signal);
      if (version !== requestVersion) return;
      items.value = data.items ?? [];
    } catch (e) {
      if (version !== requestVersion) return;
      error.value = 'Impossible de charger vos patients. Réessayez dans quelques instants.';
    } finally {
      if (version === requestVersion) loading.value = false;
    }
  }

  watch(
    debouncedQuery,
    () => {
      void load();
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    controller?.abort();
    requestVersion++;
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  return {
    searchQuery,
    debouncedQuery,
    items,
    loading,
    error,
    reload: load,
  };
}
