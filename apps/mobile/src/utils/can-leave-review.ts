import type { Appointment } from '@oneandlab/shared-types';

/** Aligné web / PatientEngagementSections — avis possible seulement si RDV terminé + intervenant assigné. */
export function canLeaveReview(appt: Appointment): boolean {
  if (appt.status !== 'completed') return false;
  // Règle serveur (AppointmentReviewPrompt) : un avis par soignant, 3e passage pour une série.
  // « reviewed_here » garde l'affichage de l'avis déjà publié sur ce RDV.
  const prompt = appt.review_prompt;
  if (prompt) return Boolean(prompt.eligible || prompt.reviewed_here);
  const t = String(appt.type ?? '');
  if (t === 'nursing' || t === 'nurse') return !!appt.assigned_nurse_id;
  if (t === 'blood_test') return !!(appt.assigned_lab_id || appt.assigned_to);
  return false;
}

export function batchHasReviewableAppointment(batch: Appointment[]): boolean {
  return batch.some(canLeaveReview);
}
