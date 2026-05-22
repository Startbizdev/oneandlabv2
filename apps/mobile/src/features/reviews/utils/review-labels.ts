import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

export function formatReviewDate(iso?: string | null): string {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid() ? d.format('D MMM YYYY') : '';
}

export function appointmentTypeLabel(type?: string | null): string {
  if (!type) return '';
  if (type === 'nursing' || type === 'nurse') return 'Soins infirmiers';
  if (type === 'blood_test') return 'Prise de sang';
  return type;
}

export function reviewerDisplayName(review: {
  reviewer_name?: string;
  patient_first_name?: string;
  patient_last_name?: string;
}): string {
  if (review.reviewer_name?.trim()) return review.reviewer_name.trim();
  const parts = [review.patient_first_name, review.patient_last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Patient';
}
