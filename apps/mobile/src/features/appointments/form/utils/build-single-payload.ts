import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import type { AppointmentFormValues } from '../types';
import { buildAvailabilityPayload } from './availability';

export function buildSingleAppointmentPayload(
  values: AppointmentFormValues,
  patientId: string | undefined,
  status: string = 'pending',
): Record<string, unknown> {
  const availability = buildAvailabilityPayload(values.availability_type, values.availability_range);
  const filesMeta = Object.entries(values.files).reduce(
    (acc, [key, f]) => {
      if (f) acc[key] = { field: key, name: f.name };
      return acc;
    },
    {} as Record<string, { field: string; name: string }>,
  );

  const form_data: Record<string, unknown> = {
    first_name: values.first_name,
    last_name: values.last_name,
    email: values.email,
    phone: values.phone,
    gender: values.gender,
    birth_date: values.birth_date,
    category_id: values.category_id || undefined,
    availability,
    files: filesMeta,
    notes: values.notes || undefined,
    care_options:
      values.care_options && Object.keys(values.care_options).length ? values.care_options : undefined,
  };

  if (isBloodTestAppointment(values.type)) {
    form_data.blood_test_type = values.blood_test_type;
    form_data.duration_days = values.blood_test_type === 'multiple' ? values.duration_days : undefined;
    form_data.custom_days = values.duration_days === 'custom' ? values.custom_days : undefined;
  } else if (isNursingAppointment(values.type)) {
    form_data.duration_days = values.duration_days;
    form_data.frequency = values.frequency;
    form_data.custom_days = values.duration_days === 'custom' ? values.custom_days : undefined;
    form_data.preferred_nurse_gender = values.preferred_nurse_gender ?? 'any';
  }

  const body: Record<string, unknown> = {
    type: values.type,
    form_type: values.type,
    scheduled_at: values.scheduled_at,
    address: values.address,
    form_data,
    status,
    patient_id: patientId,
    category_id: values.category_id || undefined,
    files: values.files,
  };

  if (!patientId && values.email?.trim()) {
    body.guest_email = values.email.trim();
  }

  return body;
}
