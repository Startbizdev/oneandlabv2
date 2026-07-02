import { apiFetch } from '~/utils/api';
import type {
  NursePassageSeries,
  NursePassageSeriesCreateResult,
  NursePassageSeriesInput,
} from '@oneandlab/shared-types';

export function useNursePassageWeb() {
  const toast = useToast();
  const saving = ref(false);

  async function createSeries(input: NursePassageSeriesInput): Promise<NursePassageSeriesCreateResult | null> {
    saving.value = true;
    try {
      const res = await apiFetch<NursePassageSeriesCreateResult>('/nurse/passages/series', {
        method: 'POST',
        body: input,
      });
      if (!res?.success || !res.data) {
        throw new Error(res?.error ?? 'Création impossible');
      }
      toast.add({
        title: `${res.data.created_appointments} passage(s) planifié(s)`,
        color: 'success',
      });
      return res.data;
    } catch (e) {
      toast.add({
        title: e instanceof Error ? e.message : 'Création impossible',
        color: 'error',
      });
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function fetchSeries(id: string): Promise<NursePassageSeries | null> {
    const res = await apiFetch<NursePassageSeries>(`/nurse/passages/series/${id}`);
    return res?.success && res.data ? res.data : null;
  }

  async function updateSeries(
    id: string,
    input: Partial<NursePassageSeriesInput>,
  ): Promise<NursePassageSeriesCreateResult | null> {
    saving.value = true;
    try {
      const res = await apiFetch<NursePassageSeriesCreateResult>(`/nurse/passages/series/${id}`, {
        method: 'PATCH',
        body: input,
      });
      if (!res?.success || !res.data) throw new Error(res?.error ?? 'Mise à jour impossible');
      toast.add({ title: 'Passage mis à jour', color: 'success' });
      return res.data;
    } catch (e) {
      toast.add({
        title: e instanceof Error ? e.message : 'Mise à jour impossible',
        color: 'error',
      });
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function materializeSeries(id: string): Promise<NursePassageSeriesCreateResult | null> {
    saving.value = true;
    try {
      const res = await apiFetch<NursePassageSeriesCreateResult>(
        `/nurse/passages/series/${id}/materialize`,
        { method: 'POST' },
      );
      if (!res?.success || !res.data) throw new Error(res?.error ?? 'Génération impossible');
      toast.add({
        title: `${res.data.created_appointments} passage(s) planifié(s)`,
        color: 'success',
      });
      return res.data;
    } catch (e) {
      toast.add({
        title: e instanceof Error ? e.message : 'Génération impossible',
        color: 'error',
      });
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function deleteSeries(id: string): Promise<boolean> {
    saving.value = true;
    try {
      const res = await apiFetch(`/nurse/passages/series/${id}`, { method: 'DELETE' });
      if (!res?.success) throw new Error(res?.error ?? 'Suppression impossible');
      toast.add({ title: 'Série annulée', color: 'success' });
      return true;
    } catch (e) {
      toast.add({
        title: e instanceof Error ? e.message : 'Suppression impossible',
        color: 'error',
      });
      return false;
    } finally {
      saving.value = false;
    }
  }

  return { saving, createSeries, fetchSeries, updateSeries, materializeSeries, deleteSeries };
}
