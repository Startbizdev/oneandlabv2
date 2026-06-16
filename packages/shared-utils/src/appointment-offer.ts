/**
 * Offre entrante : pending, pas créé par le viewer, et pas une réservation directe chez lui.
 * Réservation QR / fiche publique : assigned_nurse_id = infirmier cible → pas d'acceptation manuelle.
 */
export function isPendingIncomingOffer(
  apt: {
    status?: string;
    created_by?: string | null;
    assigned_nurse_id?: string | null;
    type?: string;
  },
  viewerUserId: string | null | undefined,
): boolean {
  if (apt?.status !== 'pending') return false;
  if (viewerUserId == null || viewerUserId === '') return true;
  const viewer = String(viewerUserId);
  const cid = apt.created_by != null && apt.created_by !== '' ? String(apt.created_by) : '';
  if (!cid) return true;
  if (cid === viewer) return false;

  const type = String(apt.type ?? '').toLowerCase();
  if (type === 'nursing' || type === 'nurse') {
    const assigned =
      apt.assigned_nurse_id != null && apt.assigned_nurse_id !== ''
        ? String(apt.assigned_nurse_id)
        : '';
    if (assigned && assigned === viewer) return false;
  }

  return true;
}

export { isBloodTestAppointment, isNursingAppointment } from './appointment-type-rules';
