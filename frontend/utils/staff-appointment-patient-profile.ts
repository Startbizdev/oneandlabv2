import { appointmentDossierPatientId, type AppointmentDossierSubject } from '@oneandlab/shared-utils';

/** Dossier patient staff depuis un rendez-vous : celui du proche bénéficiaire, sinon celui du titulaire. */
export function staffAppointmentPatientProfileHref(
  role: string | undefined,
  appointment: AppointmentDossierSubject | null | undefined,
): string | null {
  if (!appointment) return null;
  if (!canStaffOpenAppointmentPatientProfile(role)) return null;

  const dossierId = appointmentDossierPatientId(appointment);
  if (dossierId) return `/profile?${new URLSearchParams({ userId: dossierId }).toString()}`;

  // Proche sans dossier connu (ancien payload) : la page profil le résout depuis le titulaire.
  const holderId = String(appointment.patient_id ?? '').trim();
  const relativeId = String(appointment.relative?.id ?? appointment.relative_id ?? '').trim();
  if (!holderId || !relativeId) return null;
  return `/profile?${new URLSearchParams({ userId: holderId, relativeId }).toString()}`;
}

export function canStaffOpenAppointmentPatientProfile(role: string | undefined): boolean {
  return ['pro', 'nurse', 'lab', 'subaccount'].includes(role ?? '');
}
