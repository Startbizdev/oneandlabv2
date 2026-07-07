import { Alert, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarPlus,
  FilePenLine,
  FlaskConical,
  LayoutGrid,
  QrCode,
  Scale,
  Settings,
  Share2,
  Smile,
  User,
} from 'lucide-react-native';
import { SHOW_PRESCRIPTIONS_TAB_NAV } from '@/features/prescriptions/constants';
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';
import { fetchUser } from '@/features/profile/api/profile.service';
import { proPublicProfilePath } from '@/features/profile/utils/pro-public-profile';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { webAppUrl } from '@/config/env';
import { queryKeys } from '@/lib/query-keys';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { useAuthStore } from '@/store/auth-store';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { buildHelpMoreItems } from '@/features/help/help-more-items';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';

export default function ProMore() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const unread = useUnreadNotificationsCount();

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id)).data,
    enabled: !!user?.id,
  });

  const publicSlug = profileQ.data?.public_slug?.trim() ?? '';
  const publicProfileEnabled =
    profileQ.data?.is_public_profile_enabled !== false &&
    profileQ.data?.is_public_profile_enabled !== 0;

  const nav = (href: string) => router.push(href as never);

  const sharePublicProfile = async () => {
    if (!publicSlug || !publicProfileEnabled) {
      Alert.alert(
        'Profil public indisponible',
        'Activez votre fiche publique dans Mon profil pour partager votre lien.',
      );
      return;
    }
    const url = webAppUrl(proPublicProfilePath(publicSlug));
    const message =
      'Voici mon profil Cary — si vous souhaitez prendre rendez-vous, cliquez sur le lien :\n' + url;
    try {
      await Share.share({ message });
    } catch {
      Alert.alert('Partage impossible', 'Le partage n’a pas pu être ouvert. Réessayez.');
    }
  };

  return (
    <TitledTabScreenFrame title="Plus" symbol={TAB_HEADER_SF.more} fallbackIcon={LayoutGrid}>
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
              {
                icon: Smile,
                label: 'Assistant Cary',
                onPress: () => nav('/(pro)/ai'),
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
                icon: Share2,
                label: 'Partager mon profil',
                onPress: () => void sharePublicProfile(),
                iconAccent: 'teal',
              },
              {
                icon: QrCode,
                label: 'QR code',
                onPress: () => nav('/(pro)/qr-code'),
                iconAccent: 'teal',
              },
              {
                icon: FlaskConical,
                label: 'Résultats',
                onPress: () => nav('/(pro)/resultats'),
                iconAccent: 'results',
              },
              ...(!SHOW_PRESCRIPTIONS_TAB_NAV
                ? [
                    {
                      icon: FilePenLine,
                      label: 'Ordonnances',
                      onPress: () => nav('/(pro)/(tabs)/prescriptions'),
                      iconAccent: 'teal' as const,
                    },
                  ]
                : []),
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
    </TitledTabScreenFrame>
  );
}
