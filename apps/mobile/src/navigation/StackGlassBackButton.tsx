import { useNavigation, useRouter } from 'expo-router';
import { StackHeaderBackButton } from '@/navigation/StackHeaderBackButton';

/**
 * Retour stack — chevron natif dans la barre de navigation.
 * Vérifie la stack courante ET le routeur global (ex. /profile sans tab bar).
 */
export function StackGlassBackButton() {
  const navigation = useNavigation();
  const router = useRouter();

  const canGoBackInStack = navigation.canGoBack();
  const canGoBackGlobal = router.canGoBack();
  const canGoBack = canGoBackInStack || canGoBackGlobal;

  if (!canGoBack) {
    return null;
  }

  const handleBack = () => {
    if (canGoBackInStack) {
      navigation.goBack();
      return;
    }
    router.back();
  };

  return <StackHeaderBackButton onPress={handleBack} />;
}
