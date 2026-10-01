import { Alert, Share } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { webAppUrl } from '@/config/env';
import { fetchUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';

/**
 * Partage du lien de la fiche publique (infirmier, pro).
 * `publicPath` construit le chemin web depuis le slug ; `activationHref` mène à l'écran où activer la fiche.
 */
export function useSharePublicProfile(publicPath: (slug: string) => string, activationHref: Href) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(userId ?? ''),
    queryFn: async () => (await fetchUser(userId!)).data,
    enabled: Boolean(userId),
  });

  const slug = profileQ.data?.public_slug?.trim() ?? '';
  const enabled =
    profileQ.data?.is_public_profile_enabled !== false && profileQ.data?.is_public_profile_enabled !== 0;

  return async () => {
    if (!slug || !enabled) {
      Alert.alert('Fiche publique désactivée', 'Activez votre fiche publique pour partager votre lien.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Ouvrir mon profil', onPress: () => router.push(activationHref) },
      ]);
      return;
    }
    const url = webAppUrl(publicPath(slug));
    try {
      await Share.share({
        message: `Voici mon profil Cary — si vous souhaitez prendre rendez-vous, cliquez sur le lien :\n${url}`,
      });
    } catch (err) {
      console.warn('[share-public-profile] partage impossible', err);
      Alert.alert('Partage impossible', 'Le partage n’a pas pu être ouvert. Réessayez.');
    }
  };
}
