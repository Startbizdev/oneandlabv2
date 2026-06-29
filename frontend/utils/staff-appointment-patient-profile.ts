/** Dossier patient staff depuis un rendez-vous (titulaire ou proche bénéficiaire). */
export function staffAppointmentPatientProfileHref(
  role: string | undefined,
  appointment: {
    patient_id?: string | null;
    relative_id?: string | null;
    relative?: { id?: string | null } | null;
  } | null | undefined,
): string | null {
  if (!appointment) return null;
  const staffRoles = ['pro', 'nurse', 'lab', 'subaccount'];
  if (!staffRoles.includes(role ?? '')) return null;

  const patientId = String(appointment.patient_id ?? '').trim();
  if (!patientId) return null;

  const relativeId = String(
    appointment.relative?.id ?? appointment.relative_id ?? '',
  ).trim();

  const q = new URLSearchParams({ userId: patientId });
  if (relativeId) q.set('relativeId', relativeId);
  return `/profile?${q.toString()}`;
}

export function canStaffOpenAppointmentPatientProfile(role: string | undefined): boolean {
  return ['pro', 'nurse', 'lab', 'subaccount'].includes(role ?? '');
}
