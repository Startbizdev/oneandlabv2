import { useRouter } from 'expo-router';
import { Bell, Scale, Settings, User } from 'lucide-react-native';
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { buildHelpMoreItems } from '@/features/help/help-more-items';

export default function PreleveurMore() {
  const router = useRouter();
  const unread = useUnreadNotificationsCount();

  const nav = (href: string) => router.push(href as never);

  return (
    <TabScreenShell>
      <RoleMoreTabScreen
        roleLabel="Préleveur"
        sections={[
          {
            title: 'Professionnel',
            delay: 150,
            items: [{ icon: User, label: 'Mon profil', onPress: () => nav('/profile') }],
          },
          {
            title: 'Aide',
            delay: 180,
            items: buildHelpMoreItems(nav),
          },
          {
            title: 'Paramètres',
            delay: 240,
            items: [
              {
                icon: Settings,
                label: "Paramètres de l'app",
                onPress: () => nav('/profile/settings'),
                iconAccent: 'settings',
              },
              {
                icon: Bell,
                label: 'Notifications',
                onPress: () => router.push(getNotificationsPath('preleveur')),
                badge: unread,
              },
              {
                icon: PROFILE_SECURITY_MENU.Icon,
                label: PROFILE_SECURITY_MENU.label,
                onPress: () => nav(PROFILE_SECURITY_MENU.href),
                iconAccent: PROFILE_SECURITY_MENU.iconAccent,
              },
              {
                icon: Scale,
                label: 'Informations légales',
                onPress: () => nav('/(preleveur)/informations-legales'),
                iconAccent: 'muted',
              },
            ],
          },
        ]}
        logoutDelay={300}
      />
    </TabScreenShell>
  );
}
