import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchAppointmentHistory,
  fetchCarePhotos,
  fetchMedicalDocuments,
  fetchShareForNurse,
} from '../api/appointment-detail.service';

export function useAppointmentHistory(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.appointments.history(id ?? ''),
    queryFn: async () => {
      const res = await fetchAppointmentHistory(id!);
      return res.data ?? [];
    },
    enabled: !!id,
  });
}

export function useMedicalDocuments(appointmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.documents.medical(appointmentId ?? ''),
    queryFn: async () => {
      const res = await fetchMedicalDocuments(appointmentId!);
      return res.data ?? [];
    },
    enabled: !!appointmentId,
  });
}

export function useCarePhotos(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['appointments', 'care-photos', appointmentId] as const,
    queryFn: async () => {
      const res = await fetchCarePhotos(appointmentId!);
      return res.data ?? [];
    },
    enabled: !!appointmentId,
  });
}

export function useShareForNurse(appointmentId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['appointments', 'share-for-nurse', appointmentId] as const,
    queryFn: async () => {
      const res = await fetchShareForNurse(appointmentId!);
      return res.data;
    },
    enabled: !!appointmentId && enabled,
  });
}
