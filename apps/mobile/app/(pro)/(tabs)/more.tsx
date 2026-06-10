import { useRouter } from 'expo-router';
import { Bell, CalendarPlus, FlaskConical, Scale, Settings, User } from 'lucide-react-native';
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { buildHelpMoreItems } from '@/features/help/help-more-items';

export default function ProMore() {
  const router = useRouter();
  const unread = useUnreadNotificationsCount();

  const nav = (href: string) => router.push(href as never);

  return (
    <TabScreenShell>
      <RoleMoreTabScreen
        roleLabel="Professionnel de santé"
        sections={[
          {
            title: 'Actions',
            delay: 150,
            items: [
              {
                icon: CalendarPlus,
                label: 'Nouveau rendez-vous',
                onPress: () => nav('/(pro)/appointments/new'),
                iconAccent: 'teal',
              },
            ],
          },
          {
            title: 'Professionnel',
            delay: 210,
            items: [
              { icon: User, label: 'Mon profil', onPress: () => nav('/profile') },
              {
                icon: FlaskConical,
                label: 'Résultats',
                onPress: () => nav('/(pro)/resultats'),
                iconAccent: 'results',
              },
            ],
          },
          {
            title: 'Aide',
            delay: 240,
            items: buildHelpMoreItems(nav),
          },
          {
            title: 'Paramètres',
            delay: 300,
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
                onPress: () => router.push(getNotificationsPath('pro')),
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
                onPress: () => nav('/(pro)/informations-legales'),
                iconAccent: 'muted',
              },
            ],
          },
        ]}
      />
    </TabScreenShell>
  );
}
