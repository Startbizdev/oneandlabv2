import { apiRequest } from '@/api/client';
import type {
  NursePassageSeries,
  NursePassageSeriesCreateResult,
  NursePassageSeriesInput,
  NursePassageSeriesUpdateResult,
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
): Promise<NursePassageSeriesUpdateResult> {
  const res = await apiRequest<NursePassageSeriesUpdateResult>(`/nurse/passages/series/${id}`, {
    method: 'PATCH',
    body: input,
  });
  if (!res.data) throw new Error(res.error ?? 'Mise à jour impossible');
  return res.data;
}

/** Supprime la série ; renvoie le nombre de passages annulés (aujourd'hui inclus). */
export async function deleteNursePassageSeries(id: string): Promise<number> {
  const res = await apiRequest<{ canceled_appointments: number }>(`/nurse/passages/series/${id}`, {
    method: 'DELETE',
  });
  if (!res.success) throw new Error(res.error ?? 'Suppression impossible');
  return res.data?.canceled_appointments ?? 0;
}

/** Supprime un seul passage de la série, sans qu'il soit recréé ensuite. */
export async function cancelNursePassageOccurrence(seriesId: string, appointmentId: string): Promise<void> {
  const res = await apiRequest<{ series_id: string }>(`/nurse/passages/series/${seriesId}/cancel-occurrence`, {
    method: 'POST',
    body: { appointment_id: appointmentId },
  });
  if (!res.success) throw new Error(res.error ?? 'Suppression impossible');
}

/** Retire de la série le créneau quotidien de ce passage et annule ses passages à venir. */
export async function removeNursePassageSlot(seriesId: string, appointmentId: string): Promise<number> {
  const res = await apiRequest<{ canceled_appointments: number }>(`/nurse/passages/series/${seriesId}/remove-slot`, {
    method: 'POST',
    body: { appointment_id: appointmentId },
  });
  if (!res.success) throw new Error(res.error ?? 'Retrait du créneau impossible');
  return res.data?.canceled_appointments ?? 0;
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
