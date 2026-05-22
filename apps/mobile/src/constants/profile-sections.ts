/**
 * Config profil mobile — tout est sur l’écran principal (plus de sous-liens redondants).
 */

export type MobileProfileRole = 'patient' | 'nurse' | 'pro' | 'preleveur';

export function isPatientProfileRole(role: string | undefined): boolean {
  return role === 'patient';
}
