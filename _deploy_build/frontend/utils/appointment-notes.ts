/** Notes / message saisi à la réservation (`form_data.notes`, chiffré en base). */
export function getAppointmentNotes(
  appointment: { notes?: unknown; form_data?: { notes?: unknown } } | null | undefined,
): string {
  const fromForm = appointment?.form_data?.notes;
  if (typeof fromForm === 'string' && fromForm.trim()) return fromForm.trim();
  const legacy = appointment?.notes;
  if (typeof legacy === 'string' && legacy.trim()) return legacy.trim();
  return '';
}

export function hasAppointmentNotes(
  appointment: { notes?: unknown; form_data?: { notes?: unknown } } | null | undefined,
): boolean {
  return getAppointmentNotes(appointment) !== '';
}
