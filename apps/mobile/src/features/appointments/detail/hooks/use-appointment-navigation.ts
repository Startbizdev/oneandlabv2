import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import type { NavAppPref } from '@oneandlab/shared-utils';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import {
  buildTourNavigationUrl,
  cachedNavAppPrefForRole,
  navAppLabel,
  openTourNavigation,
} from '@/features/tournee-nurse/utils/tour-navigation';
import { appointmentNavigationTarget } from '../utils/appointment-navigation-target';

/** Rôles sans plan de tournée : ouverture historique dans Waze. */
const FALLBACK_NAV_APP: NavAppPref = 'waze';

/** Itinéraire vers l'adresse du RDV selon `nav_app_pref` de la tournée (infirmier, préleveur). */
export function useAppointmentNavigation(apt: Appointment, batch?: Appointment[]) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const { show: toast } = useToast();

  const resolvePref = useCallback(
    () => cachedNavAppPrefForRole(qc, role, apt.id) ?? FALLBACK_NAV_APP,
    [qc, role, apt.id],
  );

  const pref = resolvePref();
  const target = appointmentNavigationTarget(apt, batch);

  const open = useCallback(async () => {
    const opened = await openTourNavigation(resolvePref(), appointmentNavigationTarget(apt, batch));
    if (!opened) toast('Impossible d’ouvrir l’itinéraire', { type: 'error' });
  }, [apt, batch, resolvePref, toast]);

  return {
    appLabel: navAppLabel(pref),
    canNavigate: Boolean(buildTourNavigationUrl(pref, target)),
    open,
  };
}
