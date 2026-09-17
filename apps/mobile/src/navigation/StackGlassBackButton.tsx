import { useNavigation, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import { StackHeaderBackButton } from '@/navigation/StackHeaderBackButton';

/**
 * Retour stack — chevron natif dans la barre de navigation.
 * Toujours visible : stack, historique global, puis fallback vers l’accueil du rôle.
 */
export function StackGlassBackButton() {
  const navigation = useNavigation();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(`${roleRoutePrefix(role)}/(tabs)` as never);
  };

  return <StackHeaderBackButton onPress={handleBack} />;
}
