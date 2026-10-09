import { useQuery } from '@tanstack/react-query';
import { fetchPatientRelative } from '../api/patient-relatives.service';

/** Proche du patient connecté (fiche, documents, carnet). */
export function usePatientRelative(id: string | undefined) {
  return useQuery({
    queryKey: ['patient-relatives', id],
    queryFn: async () => {
      const res = await fetchPatientRelative(id ?? '');
      if (!res.success || !res.data) throw new Error(res.error ?? 'Proche introuvable');
      return res.data;
    },
    enabled: Boolean(id),
  });
}
