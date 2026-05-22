import { HeaderBackButton } from '@react-navigation/elements';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';

/** Retour vers l’écran précédent (ex. Plus → /profile). */
export function ProfileStackBackButton() {
  const router = useRouter();

  if (!router.canGoBack()) return null;

  return (
    <HeaderBackButton
      tintColor={colors.primary}
      onPress={() => router.back()}
      accessibilityLabel="Retour"
    />
  );
}
