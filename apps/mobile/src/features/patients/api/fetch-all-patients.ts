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
  let page = 1;
  const limit = 100;

  for (;;) {
    const res = await api.get<PatientRow[]>(`/patients?page=${page}&limit=${limit}${sep}`);
    if (!res.success || !Array.isArray(res.data)) break;
    all.push(...res.data);
    const pag = res.pagination as Pagination | undefined;
    const totalPages = typeof pag?.pages === 'number' && pag.pages > 0 ? pag.pages : 1;
    if (page >= totalPages || res.data.length < limit) break;
    page += 1;
  }
  return all;
}
