import { apiFetch } from '~/utils/api';

type FetchUsersParams = {
  role?: string;
  status?: 'active' | 'suspended' | 'banned';
  lab_id?: string;
  /** full = profils complets ; picker = projection légère (défaut pour listes UI). */
  scope?: 'full' | 'picker';
};

type UsersPageResponse = {
  success?: boolean;
  data?: unknown[];
  pagination?: { page?: number; limit?: number; total?: number; pages?: number };
};

export type FetchUsersPageParams = FetchUsersParams & {
  page?: number;
  limit?: number;
  search?: string;
};

/** Une page GET /users (scope picker par défaut). */
export async function fetchUsersPage(params: FetchUsersPageParams = {}): Promise<UsersPageResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const scope = params.scope ?? 'picker';
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    scope,
  });
  if (params.role) qs.set('role', params.role);
  if (params.status) qs.set('status', params.status);
  if (params.lab_id) qs.set('lab_id', params.lab_id);
  const search = params.search?.trim();
  if (search) qs.set('search', search);

  const res = await apiFetch(`/users?${qs.toString()}`, { method: 'GET' });
  return res as UsersPageResponse;
}

/** Recherche serveur pour menus (≤ limit résultats, pas de pagination client lourde). */
export async function searchUsersPicker(
  params: FetchUsersPageParams & { limit?: number },
): Promise<any[]> {
  const res = await fetchUsersPage({
    ...params,
    page: 1,
    limit: Math.min(params.limit ?? 30, 100),
    scope: 'picker',
  });
  if (!res?.success || !Array.isArray(res.data)) {
    throw new Error('Recherche indisponible. Réessayez.');
  }
  return res.data;
}

/** Recherche multi-rôles (créateur RDV admin). */
export async function searchStaffCreatorsPicker(search: string, limitPerRole = 20): Promise<any[]> {
  const q = search.trim();
  if (q.length < 2) return [];
  const roles = ['pro', 'nurse', 'lab', 'subaccount'] as const;
  const batches = await Promise.all(
    roles.map((role) =>
      searchUsersPicker({ role, status: 'active', search: q, limit: limitPerRole }).catch(() => []),
    ),
  );
  return batches.flat();
}

/** Charge tous les profils d’un rôle (pagination API) — admin assignation. */
export async function fetchAllUsers(params: FetchUsersParams = {}): Promise<any[]> {
  const scope = params.scope ?? 'picker';
  const all: any[] = [];
  const seen = new Set<string>();
  let page = 1;
  const limit = 100;

  while (true) {
    const res = await fetchUsersPage({ ...params, scope, page, limit });
    if (!res?.success || !Array.isArray(res.data)) {
      throw new Error('Impossible de charger tous les professionnels. Réessayez.');
    }

    const batch = (Array.isArray(res.data) ? res.data : []) as Record<string, unknown>[];
    for (const user of batch) {
      const id = String(user.id ?? '');
      if (!id) throw new Error('Un profil est incomplet. Réessayez.');
      if (!seen.has(id)) {
        seen.add(id);
        all.push(user);
      }
    }

    const totalPages = Number(res.pagination?.pages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 1) {
      throw new Error('Impossible de charger tous les professionnels. Réessayez.');
    }
    if (page >= totalPages) break;
    if (batch.length === 0) throw new Error('La liste des professionnels est incomplète. Réessayez.');
    page += 1;
  }

  return all;
}

export function userDisplayLabel(u: Record<string, unknown>): string {
  const company = u.company_name == null ? '' : String(u.company_name).trim();
  if (company) return company;
  const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  if (name) return name;
  return String(u.email ?? u.id ?? '');
}

export function sortUsersByLabel(users: any[]): any[] {
  return [...users].sort((a, b) =>
    userDisplayLabel(a).localeCompare(userDisplayLabel(b), 'fr', { sensitivity: 'base' }),
  );
}
