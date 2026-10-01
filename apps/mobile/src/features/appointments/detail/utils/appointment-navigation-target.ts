import type { Appointment } from '@oneandlab/shared-types';
import type { NavigationTarget } from '@oneandlab/shared-utils';
import {
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from './appointment-address-display';

/** Destination d'itinéraire d'un RDV : coordonnées si connues, sinon ligne d'adresse. */
export function appointmentNavigationTarget(
  apt: Appointment,
  batch?: Appointment[],
): NavigationTarget {
  const coords = resolveAppointmentMapCoords(apt);
  return {
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    addressLine: resolveAppointmentDetailAddressLine(apt, batch) || null,
  };
}
