import type { MobileRole } from '@oneandlab/shared-constants';

export function roleRoutePrefix(role: string | undefined): `/(nurse)` | `/(pro)` | `/(preleveur)` | `/(patient)` {
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
