import { SHOW_PRESCRIPTIONS_TAB_NAV, prescriptionGenerationEnabled } from '@/features/prescriptions/constants';
import {
  AGENDA_TAB_TRIGGER,
  createRoleTabsLayout,
  HOME_TAB_TRIGGER,
  MORE_TAB_TRIGGER,
  PATIENTS_TAB_TRIGGER,
} from '@/components/navigation/RoleNativeTabsLayout';
import { useAuthStore } from '@/store/auth-store';

export default createRoleTabsLayout(() => {
  const user = useAuthStore((s) => s.user);
  const showPrescriptions = SHOW_PRESCRIPTIONS_TAB_NAV && prescriptionGenerationEnabled(user);

  return [
    { name: 'appointments', ...HOME_TAB_TRIGGER },
    { name: 'patients', ...PATIENTS_TAB_TRIGGER },
    { name: 'calendar', ...AGENDA_TAB_TRIGGER },
    // Juste avant « Plus » : son apparition selon les droits ne décale pas les autres onglets.
    {
      name: 'prescriptions',
      hidden: !showPrescriptions,
      label: 'Prescriptions',
      sf: { default: 'doc.text', selected: 'doc.text.fill' },
      androidIcon: 'description',
    },
    { name: 'more', ...MORE_TAB_TRIGGER },
  ];
});
