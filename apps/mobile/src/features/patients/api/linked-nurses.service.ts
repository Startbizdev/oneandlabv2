import { api } from '@/api/client';

export interface LinkedNurseRow {
  id: string;
  display_name: string;
  phone?: string | null;
  source?: string;
  last_at?: string | null;
}

export async function fetchLinkedNurses(patientId: string) {
  return api.get<LinkedNurseRow[]>(`/patients/${patientId}/linked-nurses`);
}
