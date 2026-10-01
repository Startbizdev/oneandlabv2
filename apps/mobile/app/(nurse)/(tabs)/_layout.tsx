import { useAuthStore } from '@/store/auth-store';
import { useNurseDemandesBadgeCount } from '@/features/nurse/hooks/use-nurse-demandes-badge';
import {
  AGENDA_TAB_TRIGGER,
  createRoleTabsLayout,
  MORE_TAB_TRIGGER,
  PATIENTS_TAB_TRIGGER,
  TOURNEE_TAB_TRIGGER,
} from '@/components/navigation/RoleNativeTabsLayout';

export default createRoleTabsLayout(() => {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { count: demandesBadge } = useNurseDemandesBadgeCount(isHydrated);
  const demandesBadgeLabel =
    demandesBadge > 0 ? (demandesBadge > 99 ? '99+' : String(demandesBadge)) : undefined;

  return [
    { name: 'tournee', ...TOURNEE_TAB_TRIGGER },
    {
      name: 'demandes',
      label: 'Demandes',
      sf: { default: 'tray', selected: 'tray.fill' },
      androidIcon: 'inbox',
      badge: demandesBadgeLabel,
    },
    // Route `appointments` conservée : accueil après connexion et liens existants y pointent.
    { name: 'appointments', ...AGENDA_TAB_TRIGGER },
    { name: 'patients', ...PATIENTS_TAB_TRIGGER },
    { name: 'more', ...MORE_TAB_TRIGGER },
  ];
});
