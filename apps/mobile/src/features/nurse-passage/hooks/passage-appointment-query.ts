import { fetchAppointment } from '@/features/appointments/api/appointments.service';

export function passageAppointmentQueryKey(appointmentId: string) {
  return ['appointment', appointmentId] as const;
}

/** RDV d'un passage : partagé par sa fiche et sa vue « Documents ». */
export function passageAppointmentQueryOptions(appointmentId: string) {
  return {
    queryKey: passageAppointmentQueryKey(appointmentId),
    queryFn: async () => {
      const res = await fetchAppointment(appointmentId);
      if (res.success && (res as { alreadyAccepted?: boolean }).alreadyAccepted) {
        throw new Error('Ce rendez-vous a déjà été accepté par un autre professionnel.');
      }
      if (!res.success || !res.data) throw new Error(res.error ?? 'RDV introuvable');
      return res.data;
    },
    enabled: Boolean(appointmentId),
  };
}
