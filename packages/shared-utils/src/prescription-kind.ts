/** Kind d'ordonnance Cary pour pro / infirmier (actes infirmiers). */
export type PrescriptionKind = 'medical' | 'nursing';

/** Pro et infirmier : ordonnances d'actes infirmiers (comme le parcours nurse). */
export function resolvePrescriptionKindForRole(role: string | null | undefined): PrescriptionKind {
  if (role === 'nurse' || role === 'pro') {
    return 'nursing';
  }
  return 'medical';
}
