import { Alert } from 'react-native';
import { MOBILE_ROLES, ROLE_LABELS } from '@oneandlab/shared-constants';

/** Rôles réservés au site web (admin, labo, sous-compte…). */
export const NON_MOBILE_ROLES = ['super_admin', 'admin', 'lab', 'subaccount'] as const;

export function isNonMobileRole(role: string | undefined): boolean {
  if (!role) return false;
  return !MOBILE_ROLES.includes(role as (typeof MOBILE_ROLES)[number]);
}

export function roleAccessDeniedMessage(role?: string): string {
  const label = role ? (ROLE_LABELS[role] ?? role) : 'Ce type de compte';
  return `${label} n’a pas accès à l’application mobile Cary.\n\nConnectez-vous sur le site web app.oneandlab.fr depuis un ordinateur.`;
}

export function showAppNotAccessibleAlert(role?: string): void {
  Alert.alert('Application non accessible', roleAccessDeniedMessage(role), [{ text: 'OK' }]);
}

export function extractCheckEmailRole(
  res: { role?: string; data?: { role?: string } } | null | undefined,
): string | undefined {
  return res?.role ?? res?.data?.role;
}
