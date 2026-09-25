type Pagination = { page?: number; limit?: number; total?: number; pages?: number };

type ApiFetchFn = (path: string, options?: Record<string, unknown>) => Promise<{
  success?: boolean;
  data?: unknown;
  pagination?: Pagination;
}>;

export type FetchPatientsPageParams = {
  scope?: 'full' | 'picker';
  search?: string;
  page?: number;
  limit?: number;
  queryExtra?: string;
};

export async function fetchPatientsPage(
  apiFetch: ApiFetchFn,
  params: FetchPatientsPageParams = {},
): Promise<{ data: any[]; pagination?: Pagination }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const scope = params.scope ?? 'picker';
  const sep = params.queryExtra && !params.queryExtra.startsWith('&') ? `&${params.queryExtra}` : (params.queryExtra ?? '');
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    scope,
  });
  const search = params.search?.trim();
  if (search) qs.set('search', search);
  const url = `/patients?${qs.toString()}${sep}`;
  const response = await apiFetch(url, { method: 'GET' });
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error('Impossible de charger les patients. Réessayez.');
  }
  return {
    data: response.data as any[],
    pagination: (response as { pagination?: Pagination }).pagination,
  };
}

/** Recherche patient pour selects (admin / staff). */
export async function searchPatientsPicker(
  apiFetch: ApiFetchFn,
  search: string,
  limit = 30,
): Promise<any[]> {
  const q = search.trim();
  if (q.length < 2) return [];
  const { data } = await fetchPatientsPage(apiFetch, {
    scope: 'picker',
    search: q,
    page: 1,
    limit: Math.min(limit, 100),
  });
  return data;
}

/**
 * GET /patients paginé — scope picker par défaut (listes UI).
 * Pour exports ou écrans complets : `{ scope: 'full' }`.
 */
export async function fetchAllPatientsForDashboard(
  apiFetch: ApiFetchFn,
  queryExtra = '',
  options: { scope?: 'full' | 'picker' } = {},
): Promise<any[]> {
  const scope = options.scope ?? 'picker';
  const sep = queryExtra && !queryExtra.startsWith('&') ? `&${queryExtra}` : queryExtra;
  const all: any[] = [];
  const seen = new Set<string>();
  let page = 1;
  const limit = 100;

  for (;;) {
    const { data, pagination } = await fetchPatientsPage(apiFetch, {
      scope,
      page,
      limit,
      queryExtra: sep,
    });
    for (const patient of data) {
      const id = String(patient?.id ?? '');
      if (!id) throw new Error('Un dossier patient est incomplet. Réessayez.');
      if (!seen.has(id)) {
        seen.add(id);
        all.push(patient);
      }
    }
    const totalPages = Number(pagination?.pages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 1) {
      throw new Error('Pagination des patients indisponible. Réessayez.');
    }
    if (page >= totalPages) {
      break;
    }
    if (data.length === 0) throw new Error('La liste des patients est incomplète. Réessayez.');
    page += 1;
  }

  return all;
}
