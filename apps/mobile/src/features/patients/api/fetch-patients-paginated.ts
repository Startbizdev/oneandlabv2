import { api } from '@/api/client';
import type { PatientRow } from './fetch-all-patients';

export type PatientsPagination = {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
};

export async function fetchPatientsPaginated(page = 1, limit = 50) {
  const res = await api.get<PatientRow[]>(`/patients?page=${page}&limit=${limit}`);
  return {
    patients: res.data ?? [],
    pagination: (res.pagination as PatientsPagination | undefined) ?? { page, limit, total: 0, pages: 1 },
  };
}
