import {
  APPOINTMENTS_TAB_TRIGGER,
  createRoleTabsLayout,
  MORE_TAB_TRIGGER,
} from '@/components/navigation/RoleNativeTabsLayout';

export default createRoleTabsLayout([
  { name: 'appointments', ...APPOINTMENTS_TAB_TRIGGER },
  {
    name: 'book',
    accessibilityLabel: 'Réserver',
    sf: { default: 'calendar.badge.plus', selected: 'calendar.badge.plus' },
    androidIcon: 'event-available',
  },
  {
    name: 'relatives',
    accessibilityLabel: 'Proches',
    sf: { default: 'heart', selected: 'heart.fill' },
    androidIcon: 'favorite',
  },
  {
    name: 'ai',
    accessibilityLabel: 'Assistant Cary',
    sf: { default: 'face.smiling', selected: 'face.smiling' },
    androidIcon: 'sentiment-satisfied',
  },
  { name: 'more', ...MORE_TAB_TRIGGER },
]);
