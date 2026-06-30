type Pagination = { page?: number; limit?: number; total?: number; pages?: number };

type ApiFetchFn = (path: string, options?: Record<string, unknown>) => Promise<{
  success?: boolean;
  data?: unknown;
  pagination?: Pagination;
}>;

/**
 * GET /patients est paginé côté API (limit max 100). Cette fonction enchaîne les pages
 * pour retrouver tous les patients du périmètre du compte connecté (lab, sous-compte, pro, infirmier).
 */
export async function fetchAllPatientsForDashboard(
  apiFetch: ApiFetchFn,
  queryExtra = '',
): Promise<any[]> {
  const sep = queryExtra && !queryExtra.startsWith('&') ? `&${queryExtra}` : queryExtra;
  const all: any[] = [];
  let page = 1;
  const limit = 100;

  for (;;) {
    const url = `/patients?page=${page}&limit=${limit}${sep}`;
    const response = await apiFetch(url, { method: 'GET' });
    if (!response?.success || !Array.isArray(response.data)) {
      break;
    }
    all.push(...response.data);
    const pag = (response as { pagination?: Pagination }).pagination;
    const totalPages = typeof pag?.pages === 'number' && pag.pages > 0 ? pag.pages : 1;
    if (page >= totalPages || response.data.length < limit) {
      break;
    }
    page += 1;
  }

  return all;
}
