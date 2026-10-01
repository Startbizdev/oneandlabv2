import { Alert, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  CalendarPlus,
  FilePenLine,
  FlaskConical,
  QrCode,
  Share2,
  Sparkles,
  Pill,
  Inbox,
} from 'lucide-react-native';
import { usePharmacyModuleEnabled } from '@/features/pharmacy-orders/hooks/use-pharmacy-module-enabled';
import { SHOW_PRESCRIPTIONS_TAB_NAV, prescriptionGenerationEnabled } from '@/features/prescriptions/constants';
import { fetchUser } from '@/features/profile/api/profile.service';
import { proPublicProfilePath } from '@/features/profile/utils/pro-public-profile';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { webAppUrl } from '@/config/env';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function ProMore() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { canOrder: pharmacyCanOrder, canReceive: pharmacyCanReceive } = usePharmacyModuleEnabled();

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
  const rxNavEnabled = SHOW_PRESCRIPTIONS_TAB_NAV && prescriptionGenerationEnabled(user);

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
    <TitledTabScreenFrame title="Plus">
      <RoleMoreTabScreen
        roleLabel="Professionnel de santé"
        legalHref="/(pro)/informations-legales"
        sections={[
          {
            title: 'Activité',
            items: [
              ...(pharmacyCanReceive
                ? [
                    {
                      icon: Inbox,
                      label: 'Commandes reçues',
                      onPress: () => nav('/(pro)/commandes-recues'),
                      iconAccent: 'teal' as const,
                    },
                  ]
                : []),
              {
                icon: CalendarPlus,
                label: 'Nouveau rendez-vous',
                onPress: () => nav('/(pro)/appointments/new'),
                iconAccent: 'teal',
              },
              {
                icon: Sparkles,
                label: 'Assistant Cary',
                onPress: () => nav('/(pro)/ai'),
                iconAccent: 'teal',
              },
              {
                icon: FlaskConical,
                label: 'Résultats',
                onPress: () => nav('/(pro)/resultats'),
                iconAccent: 'results',
              },
              ...(!rxNavEnabled && prescriptionGenerationEnabled(user)
                ? [
                    {
                      icon: FilePenLine,
                      label: 'Ordonnances',
                      onPress: () => nav('/(pro)/prescriptions'),
                      iconAccent: 'teal' as const,
                    },
                  ]
                : []),
              ...(pharmacyCanOrder
                ? [
                    {
                      icon: Pill,
                      label: 'Commandes pharmacie',
                      onPress: () => nav('/(pro)/commandes-pharmacie'),
                      iconAccent: 'teal' as const,
                    },
                  ]
                : []),
            ],
          },
          {
            title: 'Professionnel',
            items: [
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
            ],
          },
        ]}
      />
    </TitledTabScreenFrame>
  );
}
