import { useAuthStore } from '@/store/auth-store';
import { useNurseDemandesBadgeCount } from '@/features/nurse/hooks/use-nurse-demandes-badge';
import {
  APPOINTMENTS_TAB_TRIGGER,
  CALENDAR_TAB_TRIGGER,
  createRoleTabsLayout,
  MORE_TAB_TRIGGER,
} from '@/components/navigation/RoleNativeTabsLayout';

export default createRoleTabsLayout(() => {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { count: demandesBadge } = useNurseDemandesBadgeCount(isHydrated);
  const demandesBadgeLabel =
    demandesBadge > 0 ? (demandesBadge > 99 ? '99+' : String(demandesBadge)) : undefined;

  return [
    { name: 'appointments', ...APPOINTMENTS_TAB_TRIGGER },
    {
      name: 'demandes',
      accessibilityLabel: 'Demandes',
      sf: { default: 'clipboard', selected: 'clipboard.fill' },
      androidIcon: 'assignment',
      badge: demandesBadgeLabel,
    },
    { name: 'calendar', ...CALENDAR_TAB_TRIGGER },
    {
      name: 'patients',
      accessibilityLabel: 'Patients',
      sf: { default: 'person.2', selected: 'person.2.fill' },
      androidIcon: 'people',
    },
    { name: 'more', ...MORE_TAB_TRIGGER },
  ];
});
