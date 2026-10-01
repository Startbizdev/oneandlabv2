import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { stackHeaderOptions } from '@/navigation/screen-options';
import type { Theme } from '@/theme';

export function notificationsScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return {
    ...stackHeaderOptions(theme),
    title: 'Notifications',
    headerTitle: tabHeaderTitle('Notifications'),
  };
}
