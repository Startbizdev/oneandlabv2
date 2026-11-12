/**
 * Statut affiché (jamais pour décider des actions). Pro à qui le patient a adressé sa demande (QR) :
 * un RDV en attente est « transmis aux soignants » — c'est l'infirmier ou le labo qui accepte et se déplace.
 * Même règle que l'app (`appointmentStatusForDisplay`).
 */
export function appointmentDisplayStatus(
  apt: { status?: string | null; assigned_pro_id?: string | null; created_by?: string | null } | null | undefined,
  viewer: { id?: string | null; role?: string | null } | null | undefined,
): string {
  const status = String(apt?.status ?? '');
  if (!apt || viewer?.role !== 'pro' || !viewer.id || status !== 'pending') return status;
  const viewerId = String(viewer.id);
  return String(apt.assigned_pro_id ?? '') === viewerId && String(apt.created_by ?? '') !== viewerId
    ? 'referred'
    : status;
}
