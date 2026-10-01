import {
  AGENDA_TAB_TRIGGER,
  createRoleTabsLayout,
  HOME_TAB_TRIGGER,
  MORE_TAB_TRIGGER,
  PATIENTS_TAB_TRIGGER,
  TOURNEE_TAB_TRIGGER,
} from '@/components/navigation/RoleNativeTabsLayout';

export default createRoleTabsLayout([
  { name: 'index', ...HOME_TAB_TRIGGER },
  { name: 'patients', ...PATIENTS_TAB_TRIGGER },
  { name: 'tournee', ...TOURNEE_TAB_TRIGGER },
  { name: 'calendar', ...AGENDA_TAB_TRIGGER },
  { name: 'more', ...MORE_TAB_TRIGGER },
]);
