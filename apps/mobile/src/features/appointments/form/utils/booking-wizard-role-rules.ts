import { directedProviderBookingHasLaboratory, type DirectedProvider } from '@oneandlab/shared-utils';

/** Wizard dashboard : règles de parcours selon le rôle du créateur (miroir de DashboardMultiAppointmentWizard web). */

/** Email patient facultatif à la création / mise à jour depuis le wizard staff. */
export function isPatientEmailOptionalForBookingRole(role: string): boolean {
  return role === 'nurse' || role === 'pro' || role === 'preleveur';
}

/** Le préleveur ne réserve que des prises de sang (contrôlé aussi côté API). */
export function isBloodTestOnlyBookingRole(role: string): boolean {
  return role === 'preleveur';
}

/** Pas d'étape « réseau labo » : la demande du préleveur part vers son seul laboratoire. */
export function skipsLabPreferenceStepForBookingRole(role: string): boolean {
  return role === 'preleveur';
}

/** Idem, ou réservation patient chez un laboratoire présélectionné (même règle que le web). */
export function skipsLabPreferenceStep(role: string, provider: DirectedProvider | null | undefined): boolean {
  return (
    skipsLabPreferenceStepForBookingRole(role) ||
    directedProviderBookingHasLaboratory(provider?.id, provider?.type)
  );
}