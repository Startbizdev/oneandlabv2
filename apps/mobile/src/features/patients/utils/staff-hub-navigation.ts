import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import { carePhotoDiscussionHref } from '@/features/appointments/detail/utils/care-photo-navigation';

type RolePrefix = '/(nurse)' | '/(pro)';

/** Fiche patient staff (pro / infirmier). */
export function staffPatientProfilePath(role: string, patientId?: string | null): string | null {
  const id = patientId?.trim();
  if (!id) return null;
  if (role === 'pro') return `/(pro)/patient/${id}`;
  if (role === 'nurse') return `/(nurse)/patient/${id}`;
  return null;
}

/** Route expo-router pour un item du hub Patients. */
export function staffHubItemRoute(
  item: StaffHubSearchItem,
  rolePrefix: RolePrefix,
  role: 'nurse' | 'pro',
): string {
  if (item.kind === 'patient') {
    return `${rolePrefix}/patient/${item.patient_id}`;
  }
  if (item.kind === 'document') {
    if (item.document_type === 'care_photo' && item.appointment_id) {
      return `${rolePrefix}/appointment/${item.appointment_id}?segment=exchange`;
    }
    return `${rolePrefix}/patient/${item.patient_id}/documents`;
  }
  return carePhotoDiscussionHref(role, item.appointment_id, item.medical_document_id);
}
