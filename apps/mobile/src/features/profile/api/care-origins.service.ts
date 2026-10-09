import { api } from '@/api/client';

export type CareOrigin = {
  id: string;
  professional_id: string;
  display_name: string;
  role?: string | null;
  emploi?: string | null;
  hidden_by_patient: boolean;
};

export const careOriginsQueryKey = ['patient-professional-access'] as const;

export async function fetchCareOrigins(): Promise<CareOrigin[]> {
  const response = await api.get<CareOrigin[]>('/patient/professional-access');
  if (!response.success) throw new Error(response.error ?? 'Chargement impossible');
  return response.data ?? [];
}

export async function setCareOriginHidden(id: string, hidden: boolean): Promise<void> {
  const response = await api.patch('/patient/professional-access', { id, hidden });
  if (!response.success) throw new Error(response.error ?? 'Préférence non enregistrée');
}
