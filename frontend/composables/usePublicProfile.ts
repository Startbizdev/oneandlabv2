/** Fetch only the public profile endpoint; keep private account data out of SSR payloads. */
export async function usePublicProfile(kind: 'nurse' | 'lab' | 'pro') {
  const route = useRoute();
  const config = useRuntimeConfig();
  const event = import.meta.server ? useRequestEvent() : undefined;
  const nuxtApp = useNuxtApp();
  const basePath = { nurse: '/infirmier', lab: '/Laboratoire', pro: '/professionnel' }[kind];
  const slug = computed(() => String(route.params.slug || ''));
  const result = useAsyncData(
    computed(() => `public-profile:${kind}:${slug.value}`),
    async () => {
      const base = String(config.public.apiBase || '/api').replace(/\/$/, '');
      const apiBase = import.meta.server && base.startsWith('/') ? String(config.apiInternalBase).replace(/\/$/, '') : base;
      const response = await $fetch<{ success: boolean; data?: Record<string, any>; redirect?: boolean; new_slug?: string }>(`${apiBase}/public/${kind}/${encodeURIComponent(slug.value)}`, { timeout: 10000 });
      if (response.redirect && response.new_slug) return { redirect: response.new_slug, profile: null };
      if (!response.success || !response.data) throw createError({ statusCode: 404, statusMessage: 'Profil introuvable' });
      const data = response.data;
      const name = kind === 'nurse' ? [data.first_name, data.last_name].filter(Boolean).join(' ') : data.name || [data.first_name, data.last_name].filter(Boolean).join(' ');
      const publicProfile: Record<string, any> = { ...data, role: kind === 'lab' ? 'subaccount' : kind, name: name || (kind === 'lab' ? 'Laboratoire' : 'Professionnel de santé') };
      return { redirect: null, profile: publicProfile };
    },
  );
  const profile = computed(() => result.data.value?.profile ?? null);
  const canonical = computed(() => `${String(config.public.siteUrl || 'https://cary.bio').replace(/\/$/, '')}${basePath}/${encodeURIComponent(slug.value)}`);
  const locationLabel = computed(() => {
    const data = profile.value;
    if (!data) return '';
    if (typeof data.city_plain === 'string' && data.city_plain.trim()) return data.city_plain.trim();
    if (typeof data.address === 'string') return data.address;
    return typeof data.address?.city === 'string' ? data.address.city : typeof data.address?.label === 'string' ? data.address.label : '';
  });
  useHead(() => ({
    link: [{ rel: 'canonical', href: canonical.value }],
    meta: [{ property: 'og:url', content: canonical.value }],
    script: profile.value ? [{
      key: 'public-profile-entity', type: 'application/ld+json',
      children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', url: canonical.value, name: profile.value.name, mainEntity: { '@type': kind === 'lab' ? 'Organization' : 'Person', name: profile.value.name, url: canonical.value } }).replace(/</g, '\\u003c'),
    }] : [],
  }));
  await result;
  if (result.data.value?.redirect) {
    const destination = `${basePath}/${encodeURIComponent(result.data.value.redirect)}`;
    await nuxtApp.runWithContext(() => navigateTo(destination, { redirectCode: 301 }));
  }
  if (event && result.error.value) setResponseStatus(event, result.error.value.statusCode === 404 ? 404 : 503);
  return { profile, loading: result.pending, error: computed(() => result.error.value ? 'Ce profil est introuvable ou temporairement indisponible.' : null), fetchProfile: () => result.refresh(), locationLabel };
}
