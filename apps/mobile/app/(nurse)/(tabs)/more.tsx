import { Alert, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarPlus,
  CreditCard,
  FlaskConical,
  Scale,
  ScanFace,
  Share2,
  Star,
  User,
} from 'lucide-react-native';
import { useBiometricLabel } from '@/features/profile/hooks/use-biometric-label';
import { fetchUser } from '@/features/profile/api/profile.service';
import { nursePublicProfilePath } from '@/features/profile/utils/nurse-public-profile';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { webAppUrl } from '@/config/env';
import { queryKeys } from '@/lib/query-keys';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { useAuthStore } from '@/store/auth-store';
import { getNotificationsPath } from '@/navigation/notifications-route';

export default function NurseMore() {
  const router = useRouter();
  const biometricLabel = useBiometricLabel('Biométrie');
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
        'Activez votre fiche publique dans Mon profil > Présentation pour partager votre lien.',
      );
      return;
    }
    const url = webAppUrl(nursePublicProfilePath(publicSlug));
    const message =
      `Voici mon profil Cary — si vous souhaitez prendre rendez-vous, cliquez sur le lien : ${url}`;
    try {
      await Share.share({ message, url });
    } catch {
      Alert.alert('Partage impossible', 'Le partage n’a pas pu être ouvert. Réessayez.');
    }
  };

  return (
    <TabScreenShell>
      <RoleMoreTabScreen
        roleLabel="Infirmier(ère)"
        sections={[
          {
            title: 'Actions',
            delay: 150,
            items: [
              {
                icon: CalendarPlus,
                label: 'Nouveau rendez-vous',
                onPress: () => nav('/(nurse)/appointments/new'),
                iconColor: '#0D9488',
                iconBg: '#F0FDFA',
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
                iconColor: '#0D9488',
                iconBg: '#F0FDFA',
              },
              {
                icon: Star,
                label: 'Mes avis',
                onPress: () => nav('/(nurse)/reviews'),
                iconColor: '#D97706',
                iconBg: '#FFFBEB',
              },
              {
                icon: FlaskConical,
                label: 'Résultats',
                onPress: () => nav('/(nurse)/resultats'),
                iconColor: '#059669',
                iconBg: '#ECFDF5',
              },
              {
                icon: CreditCard,
                label: 'Abonnement',
                onPress: () => nav('/(nurse)/abonnement'),
                iconColor: '#7C3AED',
                iconBg: '#F5F3FF',
              },
            ],
          },
          {
            title: 'Paramètres',
            delay: 270,
            items: [
              {
                icon: Bell,
                label: 'Notifications',
                onPress: () => router.push(getNotificationsPath('nurse')),
                badge: unread,
              },
              {
                icon: ScanFace,
                label: biometricLabel,
                onPress: () => nav('/profile/security'),
                iconColor: '#0D9488',
                iconBg: '#F0FDFA',
              },
              {
                icon: Scale,
                label: 'Informations légales',
                onPress: () => nav('/(nurse)/informations-legales'),
                iconColor: '#64748B',
                iconBg: '#F1F5F9',
              },
            ],
          },
        ]}
      />
    </TabScreenShell>
  );
}
