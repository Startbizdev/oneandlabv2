import { Alert, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  CalendarPlus,
  CreditCard,
  FilePenLine,
  FlaskConical,
  QrCode,
  Share2,
  Sparkles,
  Star,
  Pill,
} from 'lucide-react-native';
import { usePharmacyModuleEnabled } from '@/features/pharmacy-orders/hooks/use-pharmacy-module-enabled';
import { prescriptionGenerationEnabled } from '@/features/prescriptions/constants';
import { fetchUser } from '@/features/profile/api/profile.service';
import { nursePublicProfilePath } from '@/features/profile/utils/nurse-public-profile';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { webAppUrl } from '@/config/env';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function NurseMore() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { canOrder: pharmacyCanOrder } = usePharmacyModuleEnabled();

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
        roleLabel="Infirmier(ère)"
        legalHref="/(nurse)/informations-legales"
        sections={[
          {
            title: 'Activité',
            items: [
              {
                icon: CalendarPlus,
                label: 'Nouveau rendez-vous',
                onPress: () => nav('/(nurse)/appointments/new'),
                iconAccent: 'teal',
              },
              {
                icon: Sparkles,
                label: 'Assistant Cary',
                onPress: () => nav('/(nurse)/ai'),
                iconAccent: 'teal',
              },
              {
                icon: FlaskConical,
                label: 'Résultats',
                onPress: () => nav('/(nurse)/resultats'),
                iconAccent: 'results',
              },
              ...(prescriptionGenerationEnabled(user)
                ? [
                    {
                      icon: FilePenLine,
                      label: 'Ordonnances',
                      onPress: () => nav('/(nurse)/prescriptions'),
                      iconAccent: 'teal' as const,
                    },
                  ]
                : []),
              ...(pharmacyCanOrder
                ? [
                    {
                      icon: Pill,
                      label: 'Commandes pharmacie',
                      onPress: () => nav('/(nurse)/commandes-pharmacie'),
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
                onPress: () => nav('/(nurse)/qr-code'),
                iconAccent: 'teal',
              },
              {
                icon: Star,
                label: 'Mes avis',
                onPress: () => nav('/(nurse)/reviews'),
                iconAccent: 'warning',
              },
              {
                icon: CreditCard,
                label: 'Abonnement',
                onPress: () => nav('/(nurse)/abonnement'),
                iconAccent: 'warning',
              },
            ],
          },
        ]}
      />
    </TitledTabScreenFrame>
  );
}
