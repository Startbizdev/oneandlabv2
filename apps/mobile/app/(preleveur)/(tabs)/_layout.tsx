import {
  APPOINTMENTS_TAB_TRIGGER,
  CALENDAR_TAB_TRIGGER,
  createRoleTabsLayout,
  MORE_TAB_TRIGGER,
} from '@/components/navigation/RoleNativeTabsLayout';

export default createRoleTabsLayout([
  { name: 'index', ...APPOINTMENTS_TAB_TRIGGER },
  {
    name: 'tournee',
    accessibilityLabel: 'Tournée',
    sf: { default: 'map', selected: 'map.fill' },
    androidIcon: 'route',
  },
  { name: 'calendar', ...CALENDAR_TAB_TRIGGER },
  {
    name: 'ai',
    accessibilityLabel: 'Assistant Cary',
    sf: { default: 'face.smiling', selected: 'face.smiling' },
    androidIcon: 'sentiment-satisfied',
  },
  { name: 'more', ...MORE_TAB_TRIGGER },
]);
