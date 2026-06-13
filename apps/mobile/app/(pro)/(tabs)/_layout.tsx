import { Tabs } from 'expo-router';
import { Calendar, CalendarDays, FileText, LayoutGrid, Users } from 'lucide-react-native';
import { TabBar } from '@/components/navigation/TabBar';
import { tabHeaderNotificationRight } from '@/navigation/HeaderNotificationButton';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { useTabScreenOptions } from '@/navigation/screen-options';
import { SHOW_PRESCRIPTIONS_TAB_NAV } from '@/features/prescriptions/constants';
import { useAppColors } from '@/theme/use-app-colors';

export default function ProTabsLayout() {
  const c = useAppColors();
  const screenOptions = useTabScreenOptions();
  const isFocused = (color: string) => color === c.primary;

  return (
    <Tabs
      initialRouteName="appointments"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        ...screenOptions,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textTertiary,
        headerRight: tabHeaderNotificationRight(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Rendez-vous',
          headerTitle: tabHeaderTitle('Rendez-vous', CalendarDays),
          tabBarLabel: 'RDV',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          headerTitle: tabHeaderTitle('Patients', Users),
          tabBarLabel: 'Patients',
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={
          SHOW_PRESCRIPTIONS_TAB_NAV
            ? {
                title: 'Prescriptions',
                headerTitle: tabHeaderTitle('Prescriptions', FileText),
                tabBarLabel: 'Rx',
                tabBarIcon: ({ color, size }) => (
                  <FileText
                    color={color}
                    size={size}
                    strokeWidth={isFocused(color) ? 2.5 : 1.75}
                  />
                ),
              }
            : { href: null }
        }
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
