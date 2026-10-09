import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { NurseCollaborationCreateBody } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { invalidateNursePassageQueries } from '@/features/nurse-passage/hooks/invalidate-nurse-passage-queries';
import {
  createNurseCollaboration,
  deleteNurseCollaboration,
  fetchNurseCollaborations,
} from '../api/nurse-collaborations.service';

/** Une collaboration change ce que chacun voit : tournée, agenda, fiches RDV et passage. */
export function invalidateNurseCollaborationQueries(qc: QueryClient, appointmentId?: string): void {
  void qc.invalidateQueries({ queryKey: queryKeys.nurseCollaborations.all });
  invalidateNursePassageQueries(qc, appointmentId);
}

/** `appointmentId` absent : toutes mes collaborations actives (feuille de la tournée). */
export function useNurseCollaborations(appointmentId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.nurseCollaborations.list(appointmentId),
    queryFn: () => fetchNurseCollaborations(appointmentId),
    enabled,
  });
}

export function useCreateNurseCollaboration(appointmentId?: string) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  return useMutation({
    mutationFn: (body: NurseCollaborationCreateBody) => createNurseCollaboration(body),
    onSuccess: (item) => {
      invalidateNurseCollaborationQueries(qc, appointmentId);
      toast(`${item.co_nurse_name} ajouté, il est prévenu`, { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'nurse-collaboration-create', 'Ajout impossible'),
  });
}

export function useRemoveNurseCollaboration(appointmentId?: string) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => deleteNurseCollaboration(id),
    onSuccess: () => {
      invalidateNurseCollaborationQueries(qc, appointmentId);
      toast('Partage retiré', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'nurse-collaboration-remove', 'Retrait impossible'),
  });
}
