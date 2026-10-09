import type { NurseCollaboration, NurseCollaborationCreateBody } from '@oneandlab/shared-types';
import {
  nurseCollaborationPath,
  nurseCollaborationsPath,
  nursePickerSearchPath,
  type NursePickerUser,
} from '@oneandlab/shared-utils';
import { apiFetch } from '~/utils/api';

type ApiEnvelope<T> = { success: boolean; data?: T; error?: string };

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/** Binôme infirmier : `GET|POST /nurse/collaborations`, `DELETE /nurse/collaborations/{id}`. */
export function useNurseCollaborations() {
  const toast = useAppToast();
  const saving = ref(false);
  const removingId = ref<string | null>(null);

  async function list(appointmentId?: string | null): Promise<NurseCollaboration[]> {
    const res = await apiFetch<ApiEnvelope<NurseCollaboration[]>>(nurseCollaborationsPath(appointmentId));
    if (!res?.success || !Array.isArray(res.data)) throw new Error(res?.error ?? 'Confrères indisponibles');
    return res.data;
  }

  async function create(body: NurseCollaborationCreateBody): Promise<NurseCollaboration | null> {
    saving.value = true;
    try {
      const res = await apiFetch<ApiEnvelope<NurseCollaboration>>(nurseCollaborationsPath(), { method: 'POST', body });
      if (!res?.success || !res.data) throw new Error(res?.error ?? 'Ajout impossible');
      toast.add({ title: `${res.data.co_nurse_name} ajouté, il est prévenu`, color: 'success' });
      return res.data;
    } catch (e) {
      toast.add({ title: errorMessage(e, 'Ajout impossible'), color: 'error' });
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: string): Promise<boolean> {
    removingId.value = id;
    try {
      const res = await apiFetch<ApiEnvelope<unknown>>(nurseCollaborationPath(id), { method: 'DELETE' });
      if (!res?.success) throw new Error(res?.error ?? 'Retrait impossible');
      toast.add({ title: 'Partage retiré', color: 'success' });
      return true;
    } catch (e) {
      toast.add({ title: errorMessage(e, 'Retrait impossible'), color: 'error' });
      return false;
    } finally {
      removingId.value = null;
    }
  }

  async function searchNurses(search: string): Promise<NursePickerUser[]> {
    const res = await apiFetch<ApiEnvelope<NursePickerUser[]>>(nursePickerSearchPath(search));
    if (!res?.success || !Array.isArray(res.data)) throw new Error(res?.error ?? 'Recherche indisponible');
    return res.data;
  }

  return { saving, removingId, list, create, remove, searchNurses };
}
