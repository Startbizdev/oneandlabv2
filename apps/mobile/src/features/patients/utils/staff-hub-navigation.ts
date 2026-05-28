import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import { carePhotoDiscussionHref } from '@/features/appointments/detail/utils/care-photo-navigation';

type RolePrefix = '/(nurse)' | '/(pro)';

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
    if (item.source === 'appointment' && item.appointment_id) {
      const segment = item.document_type === 'care_photo' ? 'photos' : 'documents';
      return `${rolePrefix}/appointment/${item.appointment_id}?segment=${segment}`;
    }
    return `${rolePrefix}/patient/${item.patient_id}/documents`;
  }
  return carePhotoDiscussionHref(role, item.appointment_id, item.medical_document_id);
}
