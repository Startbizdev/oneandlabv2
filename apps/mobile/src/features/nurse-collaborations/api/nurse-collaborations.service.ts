import { apiRequest } from '@/api/client';
import type { NurseCollaboration, NurseCollaborationCreateBody } from '@oneandlab/shared-types';
import {
  nurseCollaborationPath,
  nurseCollaborationsPath,
  nursePickerSearchPath,
  type NursePickerUser,
} from '@oneandlab/shared-utils';

export async function fetchNurseCollaborations(appointmentId?: string): Promise<NurseCollaboration[]> {
  const res = await apiRequest<NurseCollaboration[]>(nurseCollaborationsPath(appointmentId));
  if (!res.success || !Array.isArray(res.data)) throw new Error(res.error ?? 'Confrères indisponibles');
  return res.data;
}

export async function createNurseCollaboration(body: NurseCollaborationCreateBody): Promise<NurseCollaboration> {
  const res = await apiRequest<NurseCollaboration>(nurseCollaborationsPath(), { method: 'POST', body });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Ajout impossible');
  return res.data;
}

export async function deleteNurseCollaboration(id: string): Promise<void> {
  const res = await apiRequest(nurseCollaborationPath(id), { method: 'DELETE' });
  if (!res.success) throw new Error(res.error ?? 'Retrait impossible');
}

export async function searchNursePicker(search: string): Promise<NursePickerUser[]> {
  const res = await apiRequest<NursePickerUser[]>(nursePickerSearchPath(search));
  if (!res.success || !Array.isArray(res.data)) throw new Error(res.error ?? 'Recherche indisponible');
  return res.data;
}
