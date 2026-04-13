/**
 * RDV en attente que le viewer n'a pas créé : offre entrante (masquage liste, modal d'acceptation, redirect fiche).
 * Si le viewer est `created_by`, ce n'est pas une offre — il peut voir le détail comme le créateur du flux.
 */
export function isPendingIncomingOffer(
  apt: { status?: string; created_by?: string | null },
  viewerUserId: string | null | undefined
): boolean {
  if (apt?.status !== 'pending') return false;
  if (viewerUserId == null || viewerUserId === '') return true;
  const cid = apt.created_by != null && apt.created_by !== '' ? String(apt.created_by) : '';
  if (!cid) return true;
  return cid !== String(viewerUserId);
}
