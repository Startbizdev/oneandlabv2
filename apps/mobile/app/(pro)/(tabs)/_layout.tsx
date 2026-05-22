import { Tabs } from 'expo-router';
import { Calendar, CalendarDays, FileText, Home, LayoutGrid, Users } from 'lucide-react-native';
import { TabBar } from '@/components/navigation/TabBar';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { tabScreenOptions } from '@/navigation/screen-options';
import { SHOW_PRESCRIPTIONS_TAB_NAV } from '@/features/prescriptions/constants';
import { colors } from '@/theme';

function isFocused(color: string) {
  return color === colors.primary;
}

export default function ProTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        ...tabScreenOptions(),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          headerTitle: tabHeaderTitle('Accueil', Home),
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
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
        name="prescriptions"
        options={{
          title: 'Prescriptions',
          headerTitle: tabHeaderTitle('Prescriptions', FileText),
          tabBarLabel: 'Rx',
          href: SHOW_PRESCRIPTIONS_TAB_NAV ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
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
