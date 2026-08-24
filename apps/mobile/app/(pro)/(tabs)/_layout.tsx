import { SHOW_PRESCRIPTIONS_TAB_NAV, prescriptionGenerationEnabled } from '@/features/prescriptions/constants';
import {
  APPOINTMENTS_TAB_TRIGGER,
  CALENDAR_TAB_TRIGGER,
  createRoleTabsLayout,
  MORE_TAB_TRIGGER,
} from '@/components/navigation/RoleNativeTabsLayout';
import { useAuthStore } from '@/store/auth-store';

export default createRoleTabsLayout(() => {
  const user = useAuthStore((s) => s.user);
  const showPrescriptions = SHOW_PRESCRIPTIONS_TAB_NAV && prescriptionGenerationEnabled(user);

  return [
  {
    name: 'index',
    hidden: true,
    accessibilityLabel: 'Accueil',
    sf: { default: 'house', selected: 'house.fill' },
    androidIcon: 'home',
  },
  { name: 'appointments', ...APPOINTMENTS_TAB_TRIGGER },
  {
    name: 'patients',
    accessibilityLabel: 'Patients',
    sf: { default: 'person.2', selected: 'person.2.fill' },
    androidIcon: 'people',
  },
  {
    name: 'prescriptions',
    hidden: !showPrescriptions,
    accessibilityLabel: 'Prescriptions',
    sf: { default: 'doc.text', selected: 'doc.text.fill' },
    androidIcon: 'description',
  },
  { name: 'calendar', ...CALENDAR_TAB_TRIGGER },
  { name: 'more', ...MORE_TAB_TRIGGER },
];
});
