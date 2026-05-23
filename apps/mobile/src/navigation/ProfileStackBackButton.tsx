import { useRouter } from 'expo-router';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';

/** Retour vers l’écran précédent (ex. Plus → /profile). */
export function ProfileStackBackButton() {
  const router = useRouter();

  if (!router.canGoBack()) return null;

  return <HeaderBackButton onPress={() => router.back()} />;
}
