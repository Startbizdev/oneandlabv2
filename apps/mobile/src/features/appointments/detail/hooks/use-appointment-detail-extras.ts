import { queryKeys } from '@/lib/query-keys';
import { fetchMedicalDocuments } from '../api/appointment-detail.service';

export function medicalDocumentsQueryOptions(appointmentId: string) {
  return {
    queryKey: queryKeys.documents.medical(appointmentId),
    queryFn: async () => {
      const res = await fetchMedicalDocuments(appointmentId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Documents indisponibles');
      return res.data;
    },
    enabled: Boolean(appointmentId),
  };
}
