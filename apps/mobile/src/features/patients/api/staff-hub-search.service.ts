import { api } from '@/api/client';
import type { StaffHubSearchResponse } from '@oneandlab/shared-types';

export async function fetchStaffPatientHubSearch(q: string, limit = 50) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  params.set('limit', String(limit));
  const qs = params.toString();
  return api.get<StaffHubSearchResponse>(`/search${qs ? `?${qs}` : ''}`);
}
