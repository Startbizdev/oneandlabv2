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
  const seen = new Set<string>();
  let page = 1;
  const limit = 100;

  for (;;) {
    const url = `/patients?page=${page}&limit=${limit}${sep}`;
    const response = await apiFetch(url, { method: 'GET' });
    if (!response?.success || !Array.isArray(response.data)) {
      throw new Error('Impossible de charger tous les patients. Réessayez.');
    }
    for (const patient of response.data) {
      const id = String(patient?.id ?? '');
      if (!id) throw new Error('Un dossier patient est incomplet. Réessayez.');
      if (!seen.has(id)) {
        seen.add(id);
        all.push(patient);
      }
    }
    const pag = (response as { pagination?: Pagination }).pagination;
    const totalPages = Number(pag?.pages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error('Pagination des patients indisponible. Réessayez.');
    if (page >= totalPages) {
      break;
    }
    if (response.data.length === 0) throw new Error('La liste des patients est incomplète. Réessayez.');
    page += 1;
  }

  return all;
}
