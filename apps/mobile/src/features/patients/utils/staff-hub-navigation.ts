import type { Href } from 'expo-router';
import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import {
  carePhotoDiscussionHref,
  type CarePhotoExchangeRole,
} from '@/features/appointments/detail/utils/care-photo-navigation';
import { appointmentDetailHref, staffPatientHref } from '@/navigation/role-hrefs';

/** Fiche patient staff (pro / infirmier), `null` pour les autres rôles ou sans patient. */
export function staffPatientProfileHref(role: string, patientId?: string | null): Href | null {
  const id = patientId?.trim();
  if (!id) return null;
  if (role === 'pro') return staffPatientHref('/(pro)', id);
  if (role === 'nurse') return staffPatientHref('/(nurse)', id);
  return null;
}

/** Route expo-router pour un item du hub Patients. */
export function staffHubItemRoute(item: StaffHubSearchItem, role: CarePhotoExchangeRole): Href {
  const prefix = role === 'pro' ? '/(pro)' : '/(nurse)';
  if (item.kind === 'relative') {
    return staffPatientHref(prefix, item.patient_id, undefined, { relative_id: item.relative_id });
  }
  if (item.kind === 'patient') {
    return staffPatientHref(prefix, item.patient_id);
  }
  if (item.kind === 'document') {
    if (item.document_type === 'care_photo' && item.appointment_id) {
      return appointmentDetailHref(prefix, item.appointment_id, { segment: 'exchange' });
    }
    return staffPatientHref(prefix, item.patient_id, 'documents');
  }
  return carePhotoDiscussionHref(role, item.appointment_id, item.medical_document_id);
}
