export type AppointmentTypeLike = string | null | undefined;

export function isBloodTestAppointment(type: AppointmentTypeLike): boolean {
  return String(type || '') === 'blood_test';
}

export function isNursingAppointment(type: AppointmentTypeLike): boolean {
  const normalized = String(type || '');
  return normalized === 'nursing' || normalized === 'nurse';
}

export function usesUnifiedAppointmentItems(type: AppointmentTypeLike): boolean {
  return isBloodTestAppointment(type);
}
