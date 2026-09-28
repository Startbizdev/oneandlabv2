/** source: frontend/utils/appointment-cancellation.ts */
export function canViewCancellationPhoto(role: string | null | undefined): boolean {
  if (!role) return false;
  return ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'].includes(role);
}

export type CancellableAppointment = {
  created_by?: string | null;
  assigned_nurse_id?: string | null;
  assigned_lab_id?: string | null;
  assigned_to?: string | null;
};

export type AppointmentCancelViewer = {
  role: string | null | undefined;
  id: string | null | undefined;
};

/**
 * Droit d'annuler un RDV (hors contrôle de statut). Miroir de backend/lib/AppointmentCancellationPolicy.php.
 * Infirmier, pro et patient : uniquement les RDV qu'ils ont créés (un RDV envoyé par la plateforme
 * ou un pro se redispatche ou se partage, il ne s'annule pas).
 */
export function canCancelAppointment(
  apt: CancellableAppointment | null | undefined,
  viewer: AppointmentCancelViewer,
): boolean {
  const role = String(viewer.role ?? '');
  const viewerId = String(viewer.id ?? '');
  if (role === 'super_admin') return true;
  if (!apt || viewerId === '') return false;

  const isCreator = String(apt.created_by ?? '') === viewerId;
  const isAssigned =
    String(apt.assigned_nurse_id ?? '') === viewerId
    || String(apt.assigned_lab_id ?? '') === viewerId
    || String(apt.assigned_to ?? '') === viewerId;

  switch (role) {
    case 'nurse':
    case 'pro':
    case 'patient':
      return isCreator;
    case 'lab':
    case 'subaccount':
      return isCreator || isAssigned;
    case 'preleveur':
      return isAssigned;
    default:
      return false;
  }
}
