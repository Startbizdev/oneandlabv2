import { SHOW_PRESCRIPTIONS_TAB_NAV } from '@/features/prescriptions/constants';
import {
  APPOINTMENTS_TAB_TRIGGER,
  CALENDAR_TAB_TRIGGER,
  createRoleTabsLayout,
  MORE_TAB_TRIGGER,
} from '@/components/navigation/RoleNativeTabsLayout';

export default createRoleTabsLayout([
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
    hidden: !SHOW_PRESCRIPTIONS_TAB_NAV,
    accessibilityLabel: 'Prescriptions',
    sf: { default: 'doc.text', selected: 'doc.text.fill' },
    androidIcon: 'description',
  },
  { name: 'calendar', ...CALENDAR_TAB_TRIGGER },
  { name: 'more', ...MORE_TAB_TRIGGER },
]);
