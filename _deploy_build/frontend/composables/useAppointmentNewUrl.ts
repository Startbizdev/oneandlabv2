/**
 * URL pour "Prendre rendez-vous" / "Créer un RDV" selon le rôle.
 * Patient ou non connecté → formulaire public /rendez-vous/nouveau
 * Pros (lab, nurse, subaccount, pro, admin…) → leur /appointments/new (ou liste préleveur)
 */
export function getDashboardNewAppointmentPath(role: string | undefined | null): string | null {
  if (!role || role === 'patient') return null;
  switch (role) {
    case 'lab':
      return '/lab/appointments/new';
    case 'subaccount':
      return '/subaccount/appointments/new';
    case 'nurse':
      return '/nurse/appointments/new';
    case 'pro':
      return '/pro/appointments/new';
    case 'admin':
    case 'super_admin':
      return '/admin/appointments/new';
    case 'preleveur':
      return '/preleveur/appointments';
    default:
      return null;
  }
}

export function useAppointmentNewUrl() {
  const { user } = useAuth();
  const appointmentNewUrl = computed(() => {
    const dash = getDashboardNewAppointmentPath(user.value?.role);
    if (dash) return dash;
    return '/rendez-vous/nouveau';
  });
  return { appointmentNewUrl };
}
