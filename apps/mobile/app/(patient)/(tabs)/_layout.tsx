import { Tabs } from 'expo-router';
import { CalendarDays, CalendarPlus, Heart, LayoutGrid, Star } from 'lucide-react-native';
import { TabBar } from '@/components/navigation/TabBar';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { tabScreenOptions } from '@/navigation/screen-options';
import { colors } from '@/theme';

function isFocused(color: string) {
  return color === colors.primary;
}

export default function PatientTabsLayout() {
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
        name="reviews"
        options={{
          title: 'Mes avis',
          headerTitle: tabHeaderTitle('Mes avis', Star),
          tabBarLabel: 'Avis',
          tabBarIcon: ({ color, size }) => (
            <Star color={color} size={size} strokeWidth={isFocused(color) ? 2.5 : 1.75} />
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
