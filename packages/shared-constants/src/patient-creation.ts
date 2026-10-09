/** Rôles qui créent un patient sans téléphone (miroir de `User::isPatientPhoneOptionalForCreator`). */
export const PATIENT_PHONE_OPTIONAL_CREATOR_ROLES = ['super_admin', 'pro', 'nurse'] as const;

export function isPatientPhoneOptionalForCreator(role: string | null | undefined): boolean {
  return (PATIENT_PHONE_OPTIONAL_CREATOR_ROLES as readonly string[]).includes(role ?? '');
}
