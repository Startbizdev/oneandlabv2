import type { Appointment } from '@oneandlab/shared-types';
import { appointmentAddressLine as sharedAppointmentAddressLine } from '@oneandlab/shared-utils';

export function appointmentAddressLine(apt: Appointment): string {
  return sharedAppointmentAddressLine(apt);
}
