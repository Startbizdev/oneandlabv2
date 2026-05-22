import type { Appointment } from '@oneandlab/shared-types';

/** Aligné web / PatientEngagementSections — avis possible seulement si RDV terminé + intervenant assigné. */
export function canLeaveReview(appt: Appointment): boolean {
  if (appt.status !== 'completed') return false;
  const t = String(appt.type ?? '');
  if (t === 'nursing' || t === 'nurse') return !!appt.assigned_nurse_id;
  if (t === 'blood_test') return !!(appt.assigned_lab_id || appt.assigned_to);
  return false;
}

export function batchHasReviewableAppointment(batch: Appointment[]): boolean {
  return batch.some(canLeaveReview);
}
