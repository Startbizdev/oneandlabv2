import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Bell } from 'lucide-react-native';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { stackHeaderOptions } from '@/navigation/screen-options';
import type { Theme } from '@/theme';

export function notificationsScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return {
    ...stackHeaderOptions(theme),
    title: 'Notifications',
    headerTitle: tabHeaderTitle('Notifications', TAB_HEADER_SF.notifications, Bell),
  };
}
