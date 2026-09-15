interface DirectoryProfile {
  id: string;
  slug: string;
  name: string;
  profile_image_url?: string;
  city?: string;
  presentation?: string;
  reviews_count?: number;
  average_rating?: number;
}

/** Public data only: server rendering and hydration share the same response. */
export async function usePublicDirectory(kind: 'nurses' | 'labs', city: Ref<string> | ComputedRef<string>) {
  const config = useRuntimeConfig();
  const event = import.meta.server ? useRequestEvent() : undefined;
  const pageNumber = ref(1);
  watch(city, () => { pageNumber.value = 1; });
  const result = await useAsyncData(
    computed(() => `public-directory:${kind}:${city.value}:${pageNumber.value}`),
    async () => {
      const base = String(config.public.apiBase || '/api').replace(/\/$/, '');
      const apiBase = import.meta.server && base.startsWith('/') ? String(config.apiInternalBase).replace(/\/$/, '') : base;
      const response = await $fetch<{ success: boolean; data?: DirectoryProfile[]; pagination?: { pages: number } }>(`${apiBase}/public/${kind}`, {
        query: { city: city.value, limit: 24, page: pageNumber.value },
        timeout: 10000,
      });
      if (!response.success || !Array.isArray(response.data)) throw new Error('Annuaire indisponible');
      return { items: response.data, pages: Math.max(1, Number(response.pagination?.pages) || 1) };
    },
  );
  if (import.meta.server && result.error.value) {
    if (event) setResponseStatus(event, 503);
  }
  return {
    profiles: computed(() => result.data.value?.items ?? []),
    totalPages: computed(() => result.data.value?.pages ?? 1),
    loading: result.pending,
    loadError: computed(() => !!result.error.value),
    retry: () => result.refresh(),
    pageNumber,
  };
}
