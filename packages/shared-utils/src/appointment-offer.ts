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

/** Offre masquée temporairement après « Plus tard » ou fermeture de la modal. */
export function isOfferModalSnoozed(
  apt: { offer_modal_snoozed_until?: string | null },
  now: Date = new Date(),
): boolean {
  const raw = apt?.offer_modal_snoozed_until;
  if (raw == null || String(raw).trim() === '') return false;
  const until = new Date(String(raw));
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > now.getTime();
}

export { isBloodTestAppointment, isNursingAppointment } from './appointment-type-rules';
import { isBloodTestAppointment } from './appointment-type-rules';

const STAFF_CREATOR_ROLES = ['nurse', 'pro', 'lab', 'subaccount'] as const;

/**
 * Prélèvement créé par un pro (infirmier, pro santé, lab…) encore en attente labo :
 * le créateur peut annuler / reprendre le RDV.
 */
export function staffCanManageOwnPendingBloodTest(
  apt:
    | {
        type?: string | null;
        status?: string | null;
        created_by?: string | null;
        created_by_role?: string | null;
      }
    | null
    | undefined,
  viewerUserId: string | null | undefined,
): boolean {
  if (!apt || viewerUserId == null || viewerUserId === '') return false;
  if (!isBloodTestAppointment(apt.type)) return false;
  if (String(apt.status ?? '') !== 'pending') return false;
  if (String(apt.created_by ?? '') !== String(viewerUserId)) return false;
  const creatorRole = String(apt.created_by_role ?? '');
  return (STAFF_CREATOR_ROLES as readonly string[]).includes(creatorRole);
}
