import type { Appointment } from '@oneandlab/shared-types';

export type RevieweePayload = {
  reviewee_id: string;
  reviewee_type: string;
};

/** Aligné `frontend/pages/patient/appointments/[id].vue` + `backend/api/reviews/index.php`. */
export function revieweePayloadForCompletedAppt(appt: Appointment): RevieweePayload | null {
  if (appt.status !== 'completed') return null;

  const type = String(appt.type ?? '');
  if (type === 'nursing' || type === 'nurse') {
    const nurseId = appt.assigned_nurse_id;
    if (!nurseId) return null;
    return { reviewee_id: String(nurseId), reviewee_type: 'nurse' };
  }

  if (type === 'blood_test') {
    if (appt.assigned_lab_id) {
      return { reviewee_id: String(appt.assigned_lab_id), reviewee_type: 'lab' };
    }
    if (appt.assigned_to) {
      return { reviewee_id: String(appt.assigned_to), reviewee_type: 'subaccount' };
    }
    return null;
  }

  return null;
}
