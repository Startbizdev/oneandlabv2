import { apiRequest } from '@/api/client';
import type {
  NursePassageSeries,
  NursePassageSeriesCreateResult,
  NursePassageSeriesInput,
} from '@oneandlab/shared-types';

export async function createNursePassageSeries(
  input: NursePassageSeriesInput,
): Promise<NursePassageSeriesCreateResult & { series?: NursePassageSeries }> {
  const res = await apiRequest<NursePassageSeriesCreateResult & { series?: NursePassageSeries }>(
    '/nurse/passages/series',
    { method: 'POST', body: input },
  );
  if (!res.data) throw new Error(res.error ?? 'Création passage impossible');
  return res.data;
}

export async function fetchNursePassageSeries(id: string): Promise<NursePassageSeries> {
  const res = await apiRequest<NursePassageSeries>(`/nurse/passages/series/${id}`);
  if (!res.data) throw new Error(res.error ?? 'Série introuvable');
  return res.data;
}

export async function updateNursePassageSeries(
  id: string,
  input: Partial<NursePassageSeriesInput>,
): Promise<NursePassageSeriesCreateResult & { series?: NursePassageSeries }> {
  const res = await apiRequest<NursePassageSeriesCreateResult & { series?: NursePassageSeries }>(
    `/nurse/passages/series/${id}`,
    { method: 'PATCH', body: input },
  );
  if (!res.data) throw new Error(res.error ?? 'Mise à jour impossible');
  return res.data;
}

export async function deleteNursePassageSeries(id: string): Promise<void> {
  const res = await apiRequest<null>(`/nurse/passages/series/${id}`, { method: 'DELETE' });
  if (!res.success) throw new Error(res.error ?? 'Suppression impossible');
}

export async function materializeNursePassageSeries(
  id: string,
): Promise<NursePassageSeriesCreateResult> {
  const res = await apiRequest<NursePassageSeriesCreateResult>(
    `/nurse/passages/series/${id}/materialize`,
    { method: 'POST' },
  );
  if (!res.data) throw new Error(res.error ?? 'Génération impossible');
  return res.data;
}
