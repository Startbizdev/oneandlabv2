import type { MobileRole } from '@oneandlab/shared-constants';

export type RoleRoutePrefix = '/(nurse)' | '/(pro)' | '/(preleveur)' | '/(patient)';

/** Rôles soignants disposant d'une fiche patient et des commandes pharmacie. */
export type StaffRoutePrefix = '/(nurse)' | '/(pro)';

export function roleRoutePrefix(role: string | undefined): RoleRoutePrefix {
  switch (role as MobileRole | undefined) {
    case 'pro':
      return '/(pro)';
    case 'preleveur':
      return '/(preleveur)';
    case 'patient':
      return '/(patient)';
    case 'nurse':
    default:
      return '/(nurse)';
  }
}
