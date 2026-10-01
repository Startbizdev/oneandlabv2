import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchPatientProfile } from '../api/patient-profile.service';

/** Profil d'un patient vu par un infirmier ou un pro (erreur si introuvable ou non accessible). */
export function useStaffPatientProfile(patientId: string) {
  return useQuery({
    queryKey: queryKeys.profile.user(patientId),
    queryFn: async () => {
      const res = await fetchPatientProfile(patientId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Patient introuvable');
      return res.data;
    },
    enabled: Boolean(patientId),
  });
}
