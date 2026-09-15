import { apiFetch } from '~/utils/api';

type FetchUsersParams = {
  role?: string;
  status?: 'active' | 'suspended' | 'banned';
  lab_id?: string;
};

/** Charge tous les profils d’un rôle (pagination API) — admin assignation. */
export async function fetchAllUsers(params: FetchUsersParams = {}): Promise<any[]> {
  const all: any[] = [];
  const seen = new Set<string>();
  let page = 1;
  const limit = 100;

  while (true) {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (params.role) qs.set('role', params.role);
    if (params.status) qs.set('status', params.status);
    if (params.lab_id) qs.set('lab_id', params.lab_id);

    const res = await apiFetch(`/users?${qs.toString()}`, { method: 'GET' });
    if (!res?.success || !Array.isArray(res.data)) {
      throw new Error('Impossible de charger tous les professionnels. Réessayez.');
    }

    const batch = Array.isArray(res.data) ? res.data : [];
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
