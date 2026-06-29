/** Pro : génération d'ordonnances activée (défaut oui). */
export function proPrescriptionGenerationEnabled(user: { role?: string; prescription_generation_enabled?: boolean | null } | null | undefined): boolean {
  if (!user || user.role !== 'pro') return true;
  return user.prescription_generation_enabled !== false;
}
