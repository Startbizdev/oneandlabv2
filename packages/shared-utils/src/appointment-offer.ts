/**
 * source: frontend/utils/appointment-offer.ts
 */
export function isPendingIncomingOffer(
  apt: { status?: string; created_by?: string | null },
  viewerUserId: string | null | undefined,
): boolean {
  if (apt?.status !== 'pending') return false;
  if (viewerUserId == null || viewerUserId === '') return true;
  const cid = apt.created_by != null && apt.created_by !== '' ? String(apt.created_by) : '';
  if (!cid) return true;
  return cid !== String(viewerUserId);
}

export { isBloodTestAppointment, isNursingAppointment } from './appointment-type-rules';
