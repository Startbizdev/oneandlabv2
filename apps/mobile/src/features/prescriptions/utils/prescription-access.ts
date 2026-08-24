/** Pro / infirmier : génération d'ordonnances activée (défaut oui). */
export function prescriptionGenerationEnabled(
  user: { role?: string; prescription_generation_enabled?: boolean | null } | null | undefined,
): boolean {
  if (!user) return true;
  if (user.role !== 'pro' && user.role !== 'nurse') return true;
  return user.prescription_generation_enabled !== false;
}
