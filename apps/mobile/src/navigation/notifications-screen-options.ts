import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Bell } from 'lucide-react-native';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { stackHeaderOptions } from '@/navigation/screen-options';

export function notificationsScreenOptions(): NativeStackNavigationOptions {
  return {
    ...stackHeaderOptions(),
    title: 'Notifications',
    headerTitle: tabHeaderTitle('Notifications', Bell),
  };
}
