import { Tabs } from 'expo-router';
import { Calendar, CalendarDays, LayoutGrid, Route } from 'lucide-react-native';
import { TabBar } from '@/components/navigation/TabBar';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { tabScreenOptions } from '@/navigation/screen-options';
import { colors } from '@/theme';

function isFocused(color: string) {
  return color === colors.primary;
}

export default function PreleveurTabsLayout() {
  return (
    <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          ...tabScreenOptions(),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          headerRight: () => <HeaderNotificationBell />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Rendez-vous',
            headerTitle: tabHeaderTitle('Rendez-vous', CalendarDays),
            tabBarLabel: 'RDV',
            tabBarIcon: ({ color, size }) => (
              <CalendarDays
                color={color}
                size={size}
                strokeWidth={isFocused(color) ? 2.5 : 1.75}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="tournee"
          options={{
            title: 'Tournée',
            headerTitle: tabHeaderTitle('Tournée', Route),
            tabBarLabel: 'Tournée',
            tabBarIcon: ({ color, size }) => (
              <Route color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendrier',
            headerTitle: tabHeaderTitle('Calendrier', Calendar),
            tabBarLabel: 'Calendrier',
            tabBarIcon: ({ color, size }) => (
              <Calendar color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
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
