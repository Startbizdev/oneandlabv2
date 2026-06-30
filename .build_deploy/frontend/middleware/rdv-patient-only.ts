import { getDashboardNewAppointmentPath } from '~/composables/useAppointmentNewUrl';

/**
 * /rendez-vous/nouveau : réservé au parcours patient (et invités).
 * Comptes pro → redirection vers le formulaire du tableau de bord.
 */
export default defineNuxtRouteMiddleware(() => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated.value || !user.value?.role) return;
  if (user.value.role === 'patient') return;
  const target = getDashboardNewAppointmentPath(user.value.role);
  if (target) {
    return navigateTo(target, { replace: true });
  }
});
