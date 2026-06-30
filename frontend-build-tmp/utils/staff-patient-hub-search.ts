import type { StaffHubSearchResponse } from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';

export async function fetchStaffPatientHubSearch(
  q: string,
  limit = 50,
): Promise<StaffHubSearchResponse> {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  params.set('limit', String(limit));
  const qs = params.toString();
  const res = (await apiFetch(`/search${qs ? `?${qs}` : ''}`, { method: 'GET' })) as {
    success?: boolean;
    data?: StaffHubSearchResponse;
    error?: string;
  };
  if (!res?.success || !res.data) {
    throw new Error(typeof res?.error === 'string' ? res.error : 'Recherche impossible');
  }
  return res.data;
}
