import {
  ACCOUNT_TAB_TRIGGER,
  createRoleTabsLayout,
  HOME_TAB_TRIGGER,
} from '@/components/navigation/RoleNativeTabsLayout';

export default createRoleTabsLayout([
  { name: 'appointments', ...HOME_TAB_TRIGGER },
  {
    name: 'results',
    label: 'Résultats',
    sf: { default: 'doc.text.magnifyingglass', selected: 'doc.text.magnifyingglass' },
    androidIcon: 'science',
  },
  {
    name: 'book',
    label: 'Réserver',
    sf: { default: 'calendar.badge.plus', selected: 'calendar.badge.plus' },
    androidIcon: 'event-available',
  },
  {
    name: 'ai',
    label: 'Assistant',
    sf: { default: 'sparkles', selected: 'sparkles' },
    androidIcon: 'auto-awesome',
  },
  { name: 'more', ...ACCOUNT_TAB_TRIGGER },
]);
