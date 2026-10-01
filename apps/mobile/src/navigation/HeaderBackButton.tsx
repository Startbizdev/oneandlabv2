import { useNavigation, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { useAuthStore } from '@/store/auth-store';

type Props = {
  /** Retour propre à l'écran (étape précédente d'un assistant…). */
  onPress?: () => void;
};

/** Retour de pile : pile courante, historique global, puis accueil du rôle. */
export function HeaderBackButton({ onPress }: Props) {
  const navigation = useNavigation();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(role ? getRoleHome(role) : '/');
  };

  return <HeaderAction icon={ChevronLeft} accessibilityLabel="Retour" onPress={onPress ?? goBack} />;
}
