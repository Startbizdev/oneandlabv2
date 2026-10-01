/**
 * RDV à ouvrir depuis un lien partagé ou une notification (`?openAppointment=`, contrat backend
 * `ProfessionalAppointmentLinks`). `appointment_id` n'en fait pas partie : c'est un paramètre de route
 * (ex. `passage/[seriesId]?appointment_id=`) qui ne doit pas détourner la navigation.
 */
export function offerLinkAppointmentId(queryParams: Record<string, unknown> | null | undefined): string | null {
  const id = queryParams?.openAppointment;
  return typeof id === 'string' && id !== '' ? id : null;
}
