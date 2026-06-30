import { ref, watch } from 'vue';
import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import { fetchStaffPatientHubSearch } from '~/utils/staff-patient-hub-search';

export function useStaffPatientHubSearch() {
  const searchQuery = ref('');
  const debouncedQuery = ref('');
  const items = ref<StaffHubSearchItem[]>([]);
  const loading = ref(true);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    searchQuery,
    (q) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debouncedQuery.value = q;
      }, 320);
    },
    { immediate: true },
  );

  async function load() {
    loading.value = true;
    try {
      const data = await fetchStaffPatientHubSearch(debouncedQuery.value);
      items.value = data.items ?? [];
    } catch (e) {
      console.error('Hub search:', e);
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  watch(
    debouncedQuery,
    () => {
      void load();
    },
    { immediate: true },
  );

  return {
    searchQuery,
    debouncedQuery,
    items,
    loading,
    reload: load,
  };
}
