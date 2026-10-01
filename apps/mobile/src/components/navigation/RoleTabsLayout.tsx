import { Tabs } from 'expo-router';
import { AppTabBar } from '@/components/navigation/AppTabBar';
import { ROLE_TABS, visibleRoleTabs, type TabRole } from '@/navigation/role-tabs';

type Props = {
  role: TabRole;
  /** Compteurs des onglets `hasBadge`, par nom de route. */
  badges?: Partial<Record<string, number>>;
  /** Visibilité des onglets `conditional`, par nom de route (masqués par défaut). */
  visible?: Partial<Record<string, boolean>>;
};

const NO_BADGES: Partial<Record<string, number>> = {};

/** Onglets d'un rôle — expo-router `Tabs` + barre custom unique `AppTabBar`. */
export function RoleTabsLayout({ role, badges = NO_BADGES, visible }: Props) {
  const tabs = ROLE_TABS[role];
  const shown = visibleRoleTabs(tabs, visible);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AppTabBar {...props} tabs={shown} badges={badges} />}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}
