/**
 * Types de notifications qui doivent rafraîchir les listes de rendez-vous.
 */
export function notificationShouldRefreshAppointmentsList(
  type: string | null | undefined,
  data?: unknown,
): boolean {
  const t = String(type ?? '').trim();
  if (!t) return false;

  const appointmentTypes = new Set([
    'new_appointment_created',
    'new_appointment_available',
    'appointment_request_sent',
    'appointment_accepted',
    'appointment_accepted_lab',
    'appointment_reassigned',
    'appointment_redispatched',
    'conversation_message',
    'results_ready',
    'results_available',
    'care_gallery_photo',
    'care_gallery_comment',
    'share_link_appointment_taken',
  ]);

  if (appointmentTypes.has(t)) return true;

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const aptId = record.appointment_id ?? record.appointmentId;
    if (aptId != null && String(aptId).trim() !== '') return true;
  }

  return false;
}
