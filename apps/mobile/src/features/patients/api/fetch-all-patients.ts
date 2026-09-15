import { api } from '@/api/client';

export interface PatientRow {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  email_display?: string | null;
  phone?: string;
  birth_date?: string;
  nir?: string | null;
  gender?: string;
  profile_image_url?: string | null;
  address?: Record<string, unknown>;
  created_by?: string;
}

type Pagination = { page?: number; limit?: number; pages?: number };

/** source: frontend/utils/fetch-all-patients.ts */
export async function fetchAllPatients(queryExtra = ''): Promise<PatientRow[]> {
  const sep = queryExtra && !queryExtra.startsWith('&') ? `&${queryExtra}` : queryExtra;
  const all: PatientRow[] = [];
  const seen = new Set<string>();
  let page = 1;
  const limit = 100;

  for (;;) {
    const res = await api.get<PatientRow[]>(`/patients?page=${page}&limit=${limit}${sep}`);
    if (!res.success || !Array.isArray(res.data)) throw new Error('Impossible de charger tous les patients. Réessayez.');
    for (const patient of res.data) {
      const id = String(patient?.id ?? '');
      if (!id) throw new Error('Un dossier patient est incomplet. Réessayez.');
      if (!seen.has(id)) {
        seen.add(id);
        all.push(patient);
      }
    }
    const pag = res.pagination as Pagination | undefined;
    const totalPages = Number(pag?.pages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error('Pagination des patients indisponible. Réessayez.');
    if (page >= totalPages) break;
    if (res.data.length === 0) throw new Error('La liste des patients est incomplète. Réessayez.');
    page += 1;
  }
  return all;
}
