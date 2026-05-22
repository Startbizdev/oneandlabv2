import { useQuery } from '@tanstack/react-query';
import {
  fetchProfileDocuments,
  mapProfileDocumentsByType,
  type PatientDocumentRow,
} from '@/features/patients/api/patient-profile.service';

export function useWizardProfileDocuments(opts: {
  enabled: boolean;
  patientUserId?: string | null;
  relativeId?: string | null;
  selfPatient?: boolean;
}) {
  const canLoad =
    opts.enabled &&
    (opts.selfPatient || Boolean(opts.relativeId) || Boolean(opts.patientUserId));

  return useQuery({
    queryKey: [
      'profile-documents',
      'wizard',
      opts.selfPatient ? 'self' : '',
      opts.patientUserId ?? '',
      opts.relativeId ?? '',
    ] as const,
    enabled: canLoad,
    queryFn: async (): Promise<Record<string, PatientDocumentRow>> => {
      const res = await fetchProfileDocuments({
        userId: opts.selfPatient ? undefined : opts.patientUserId ?? undefined,
        relativeId: opts.relativeId ?? undefined,
      });
      if (!res.success) throw new Error(res.error ?? 'Impossible de charger les documents');
      return mapProfileDocumentsByType(res.data);
    },
  });
}
