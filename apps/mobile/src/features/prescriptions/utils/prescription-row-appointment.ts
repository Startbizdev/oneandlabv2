import type { Appointment } from '@oneandlab/shared-types';
import type { ProPrescriptionRow } from '../api/prescriptions.service';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';

/** Objet RDV minimal pour réutiliser les composants liste (`RdvCareTagsRow`, etc.). */
export function prescriptionRowAsAppointment(row: ProPrescriptionRow): Appointment {
  const type = row.appointment_type ?? undefined;
  const careItems = row.appointment_care_items ?? undefined;
  const apt = {
    id: row.appointment_id ?? row.id,
    scheduled_at: row.appointment_scheduled_at ?? undefined,
    status: row.appointment_status ?? undefined,
    type,
    category_name: row.appointment_category_name ?? undefined,
    creation_batch_id: row.appointment_creation_batch_id ?? undefined,
    form_data: {
      availability: row.appointment_availability,
    },
  } as Appointment & {
    nursing_items_display?: Array<Record<string, unknown>>;
    blood_test_items_display?: Array<Record<string, unknown>>;
  };

  if (careItems?.length) {
    if (isNursingAppointment(type)) {
      apt.nursing_items_display = careItems;
    } else if (isBloodTestAppointment(type)) {
      apt.blood_test_items_display = careItems;
    }
  }

  return apt;
}
