import { api } from '@/api/client';
import type { LabResultsListResponse } from '@oneandlab/shared-types';

export async function fetchLabResults(query: string, page = 1, limit = 50) {
  const qs = new URLSearchParams();
  if (query.trim()) qs.set('q', query.trim());
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  return api.get<LabResultsListResponse>(`/lab-results?${qs.toString()}`);
}
