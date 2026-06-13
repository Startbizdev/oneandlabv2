import { Tabs } from 'expo-router';
import { Calendar, CalendarDays, ClipboardList, LayoutGrid, Users } from 'lucide-react-native';
import { TabBar } from '@/components/navigation/TabBar';
import { TabBarIconBadge } from '@/components/navigation/TabBarIconBadge';
import { tabHeaderNotificationRight } from '@/navigation/HeaderNotificationButton';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { useTabScreenOptions } from '@/navigation/screen-options';
import { useNurseDemandesBadgeCount } from '@/features/nurse/hooks/use-nurse-demandes-badge';
import { useAuthStore } from '@/store/auth-store';
import { useAppColors } from '@/theme/use-app-colors';

export default function NurseTabsLayout() {
  const c = useAppColors();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { count: demandesBadge } = useNurseDemandesBadgeCount(isHydrated);
  const screenOptions = useTabScreenOptions();
  const isFocused = (color: string) => color === c.primary;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        ...screenOptions,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textTertiary,
        headerRight: tabHeaderNotificationRight(),
      }}
    >
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
        name="demandes"
        options={{
          title: 'Mes demandes',
          headerTitle: tabHeaderTitle('Mes demandes', ClipboardList),
          tabBarLabel: 'Demandes',
          tabBarIcon: ({ color, size }) => (
            <TabBarIconBadge
              Icon={ClipboardList}
              color={color}
              size={size}
              strokeWidth={isFocused(color) ? 2.5 : 1.75}
              badge={demandesBadge}
            />
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
