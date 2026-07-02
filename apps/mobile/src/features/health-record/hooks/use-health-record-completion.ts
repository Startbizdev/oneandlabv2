import { useQuery } from '@tanstack/react-query';
import { fetchHealthRecordCompletion } from '../api/health-record.service';

export const healthRecordQueryKeys = {
  completion: ['health-record', 'completion'] as const,
  recap: ['health-record', 'recap'] as const,
  schema: ['health-record', 'schema'] as const,
  staffRecap: (patientId: string) => ['health-record', 'staff', patientId] as const,
};

export function useHealthRecordCompletion(enabled = true) {
  return useQuery({
    queryKey: healthRecordQueryKeys.completion,
    queryFn: fetchHealthRecordCompletion,
    enabled,
    staleTime: 0,
  });
}
