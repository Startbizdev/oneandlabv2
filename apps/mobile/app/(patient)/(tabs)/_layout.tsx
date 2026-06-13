import { Tabs } from 'expo-router';
import { CalendarDays, CalendarPlus, Heart, LayoutGrid, Smile } from 'lucide-react-native';
import { TabBar } from '@/components/navigation/TabBar';
import { tabHeaderNotificationRight } from '@/navigation/HeaderNotificationButton';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { useTabScreenOptions } from '@/navigation/screen-options';
import { useAppColors } from '@/theme/use-app-colors';

export default function PatientTabsLayout() {
  const c = useAppColors();
  const screenOptions = useTabScreenOptions();
  const isFocused = (color: string) => color === c.primary;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        ...screenOptions,
        lazy: true,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textTertiary,
        headerRight: tabHeaderNotificationRight(),
      }}
    >
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Mes rendez-vous',
          headerTitle: tabHeaderTitle('Mes rendez-vous', CalendarDays),
          tabBarLabel: 'RDV',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Réserver',
          headerTitle: tabHeaderTitle('Réserver', CalendarPlus),
          headerRight: () => null,
          tabBarLabel: 'Réserver',
          tabBarIcon: ({ color, size }) => (
            <CalendarPlus color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="relatives"
        options={{
          title: 'Mes proches',
          headerTitle: tabHeaderTitle('Mes proches', Heart),
          tabBarLabel: 'Proches',
          tabBarIcon: ({ color, size }) => (
            <Heart color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'Assistant Cary',
          headerTitle: tabHeaderTitle('Assistant Cary', Smile),
          headerRight: () => null,
          tabBarHideOnKeyboard: true,
          tabBarLabel: 'Cary',
          tabBarIcon: ({ color, size }) => (
            <Smile color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Plus',
          headerTitle: tabHeaderTitle('Plus', LayoutGrid),
          tabBarLabel: 'Plus',
          tabBarIcon: ({ color, size }) => (
            <LayoutGrid color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
          ),
        }}
      />
    </Tabs>
  );
}
