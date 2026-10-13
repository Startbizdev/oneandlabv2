import { citySlugFrom } from '~/seo/citySlug'

/** Fetch only the public profile endpoint; keep private account data out of SSR payloads. */
export async function usePublicProfile(kind: 'nurse' | 'lab' | 'pro') {
  const route = useRoute();
  const config = useRuntimeConfig();
  const event = import.meta.server ? useRequestEvent() : undefined;
  const nuxtApp = useNuxtApp();
  const basePath = { nurse: '/infirmier', lab: '/laboratoire', pro: '/professionnel' }[kind];
  const directoryPath = { nurse: '/infirmiers', lab: '/laboratoires', pro: null as string | null }[kind];
  const directoryLabel = { nurse: 'Infirmiers', lab: 'Laboratoires', pro: null as string | null }[kind];
  const cityBasePath = { nurse: '/infirmier/ville', lab: '/laboratoire/ville', pro: null as string | null }[kind];
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
  const siteOrigin = computed(() => String(config.public.siteUrl || 'https://cary.bio').replace(/\/$/, ''));
  const canonical = computed(() => `${siteOrigin.value}${basePath}/${encodeURIComponent(slug.value)}`);
  const locationLabel = computed(() => {
    const data = profile.value;
    if (!data) return '';
    if (typeof data.city_plain === 'string' && data.city_plain.trim()) return data.city_plain.trim();
    if (typeof data.address === 'string') return data.address;
    return typeof data.address?.city === 'string' ? data.address.city : typeof data.address?.label === 'string' ? data.address.label : '';
  });
  const cityPagePath = computed(() => {
    if (!cityBasePath || !profile.value) return null;
    const city = typeof profile.value.city_plain === 'string' ? profile.value.city_plain.trim() : '';
    const citySlug = citySlugFrom(city);
    if (!citySlug) return null;
    return `${cityBasePath}/${encodeURIComponent(citySlug)}`;
  });

  useHead(() => {
    const data = profile.value;
    if (!data) {
      return {
        link: [{ rel: 'canonical', href: canonical.value }],
        meta: [{ property: 'og:url', content: canonical.value }],
        script: [],
      };
    }

    const name = String(data.name || '');
    const cityPlain = typeof data.city_plain === 'string' ? data.city_plain.trim() : '';
    const cityUrl = cityPagePath.value ? `${siteOrigin.value}${cityPagePath.value}` : null;
    const entityId = `${canonical.value}#entity`;
    const businessId = `${canonical.value}#business`;

    const reviewsCount = resolveReviewsCount(data);
    const averageRating = resolveAverageRating(data);
    const aggregateRating =
      reviewsCount > 0 && averageRating != null
        ? {
            '@type': 'AggregateRating',
            ratingValue: averageRating,
            reviewCount: reviewsCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined;

    const areaServed = cityPlain
      ? { '@type': 'City', name: cityPlain }
      : undefined;

    const graph: Record<string, unknown>[] = [
      {
        '@type': 'WebPage',
        '@id': `${canonical.value}#webpage`,
        url: canonical.value,
        name,
        mainEntity: { '@id': entityId },
      },
    ];

    if (kind === 'nurse') {
      const person: Record<string, unknown> = {
        '@type': 'Person',
        '@id': entityId,
        name,
        url: canonical.value,
        ...(areaServed ? { homeLocation: areaServed } : {}),
        ...(cityUrl ? { sameAs: [cityUrl] } : {}),
      };
      const business: Record<string, unknown> = {
        '@type': 'MedicalBusiness',
        '@id': businessId,
        name,
        url: canonical.value,
        ...(areaServed ? { areaServed } : {}),
        ...(aggregateRating ? { aggregateRating } : {}),
        ...(cityUrl ? { sameAs: [cityUrl] } : {}),
        employee: { '@id': entityId },
      };
      graph.push(person, business);
    } else if (kind === 'lab') {
      const organization: Record<string, unknown> = {
        '@type': ['MedicalOrganization', 'MedicalBusiness'],
        '@id': entityId,
        name,
        url: canonical.value,
        ...(areaServed ? { areaServed } : {}),
        ...(aggregateRating ? { aggregateRating } : {}),
        ...(cityUrl ? { sameAs: [cityUrl] } : {}),
      };
      graph.push(organization);
    } else {
      graph.push({
        '@type': 'Person',
        '@id': entityId,
        name,
        url: canonical.value,
        ...(areaServed ? { homeLocation: areaServed } : {}),
      });
    }

    const crumbs: Array<{ name: string; path: string }> = [
      { name: 'Accueil', path: '/' },
    ];
    if (directoryPath && directoryLabel) {
      crumbs.push({ name: directoryLabel, path: directoryPath });
    }
    crumbs.push({ name, path: `${basePath}/${encodeURIComponent(slug.value)}` });

    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: `${siteOrigin.value}${crumb.path}`,
      })),
    });

    return {
      link: [{ rel: 'canonical', href: canonical.value }],
      meta: [{ property: 'og:url', content: canonical.value }],
      script: [{
        key: 'public-profile-entity',
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': graph,
        }).replace(/</g, '\\u003c'),
      }],
    };
  });

  await result;
  if (result.data.value?.redirect) {
    const destination = `${basePath}/${encodeURIComponent(result.data.value.redirect)}`;
    await nuxtApp.runWithContext(() => navigateTo(destination, { redirectCode: 301 }));
  }
  if (event && result.error.value) setResponseStatus(event, result.error.value.statusCode === 404 ? 404 : 503);
  return {
    profile,
    loading: result.pending,
    error: computed(() => result.error.value ? 'Ce profil est introuvable ou temporairement indisponible.' : null),
    fetchProfile: () => result.refresh(),
    locationLabel,
    cityPagePath,
  };
}

function resolveReviewsCount(data: Record<string, any>): number {
  if (typeof data.reviews_count === 'number' && Number.isFinite(data.reviews_count)) {
    return data.reviews_count;
  }
  const total = data.reviews?.stats?.total_reviews;
  if (typeof total === 'number' && Number.isFinite(total)) return total;
  if (typeof total === 'string' && total.trim() !== '' && Number.isFinite(Number(total))) return Number(total);
  return 0;
}

function resolveAverageRating(data: Record<string, any>): number | null {
  if (typeof data.average_rating === 'number' && Number.isFinite(data.average_rating)) {
    return data.average_rating;
  }
  if (typeof data.average_rating === 'string' && data.average_rating.trim() !== '' && Number.isFinite(Number(data.average_rating))) {
    return Number(data.average_rating);
  }
  const rating = data.reviews?.stats?.average_rating;
  if (typeof rating === 'number' && Number.isFinite(rating)) return rating;
  if (typeof rating === 'string' && rating.trim() !== '' && Number.isFinite(Number(rating))) return Number(rating);
  return null;
}
