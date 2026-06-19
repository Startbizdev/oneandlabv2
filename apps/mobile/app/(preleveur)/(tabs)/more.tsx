import { useRouter } from 'expo-router';
import { Bell, LayoutGrid, Scale, Settings, Smile, User } from 'lucide-react-native';
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { buildHelpMoreItems } from '@/features/help/help-more-items';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';

export default function PreleveurMore() {
  const router = useRouter();
  const unread = useUnreadNotificationsCount();

  const nav = (href: string) => router.push(href as never);

  return (
    <TitledTabScreenFrame title="Plus" symbol={TAB_HEADER_SF.more} fallbackIcon={LayoutGrid}>
      <RoleMoreTabScreen
        roleLabel="Préleveur"
        sections={[
          {
            title: 'Actions',
            delay: 150,
            items: [
              {
                icon: Smile,
                label: 'Assistant Cary',
                onPress: () => nav('/(preleveur)/ai'),
                iconAccent: 'teal',
              },
            ],
          },
          {
            title: 'Professionnel',
            delay: 180,
            items: [{ icon: User, label: 'Mon profil', onPress: () => nav('/profile') }],
          },
          {
            title: 'Aide',
            delay: 210,
            items: buildHelpMoreItems(nav),
          },
          {
            title: 'Paramètres',
            delay: 270,
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
    </TitledTabScreenFrame>
  );
}
