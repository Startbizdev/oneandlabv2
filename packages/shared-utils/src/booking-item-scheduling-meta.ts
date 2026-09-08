import { isBloodTestAppointment, isNursingAppointment } from './appointment-type-rules';

export type BookingSchedulingSlice = {
  blood_test_type?: string;
  duration_days?: string;
  custom_days?: number | null;
  frequency?: string;
};

/** Méta fréquence / prise en charge (ou prélèvement) stockée dans `care_options` de chaque acte fusionné. */
export function mergeSchedulingMetaIntoItemCareOptions(
  careOptions: Record<string, string | number> | undefined,
  slice: BookingSchedulingSlice,
  serviceType: string,
): Record<string, string | number> {
  const co: Record<string, string | number> = { ...(careOptions ?? {}) };

  if (isNursingAppointment(serviceType)) {
    if (slice.duration_days) co._duration_days = slice.duration_days;
    if (
      slice.duration_days === 'custom' &&
      slice.custom_days != null &&
      Number(slice.custom_days) > 0
    ) {
      co._custom_days = Number(slice.custom_days);
    } else {
      delete co._custom_days;
    }
    if (slice.frequency) co._frequency = slice.frequency;
    else delete co._frequency;
    return co;
  }

  if (isBloodTestAppointment(serviceType)) {
    if (slice.blood_test_type) co._blood_test_type = slice.blood_test_type;
    if (slice.blood_test_type === 'multiple' && slice.duration_days) {
      co._duration_days = slice.duration_days;
    } else {
      delete co._duration_days;
    }
    if (
      slice.duration_days === 'custom' &&
      slice.custom_days != null &&
      Number(slice.custom_days) > 0
    ) {
      co._custom_days = Number(slice.custom_days);
    } else {
      delete co._custom_days;
    }
  }

  return co;
}

/** Tous les actes infirmiers / prélèvements du panier (validation fréquence & prise en charge par soin). */
export function servicesRequiringSchedulingValidation<T extends { type: string }>(
  selectedServices: T[],
): T[] {
  return selectedServices.filter(
    (s) => isBloodTestAppointment(s.type) || isNursingAppointment(s.type),
  );
}
