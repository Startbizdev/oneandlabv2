import { useQuery } from '@tanstack/react-query';
import { fetchPatientProfile } from '@/features/patients/api/patient-profile.service';

export function passagePatientQueryKey(patientId: string) {
  return ['passage-patient', patientId] as const;
}

export function usePassagePatient(patientId: string) {
  return useQuery({
    queryKey: passagePatientQueryKey(patientId),
    queryFn: async () => {
      const res = await fetchPatientProfile(patientId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Patient introuvable');
      return res.data;
    },
    enabled: Boolean(patientId),
  });
}
