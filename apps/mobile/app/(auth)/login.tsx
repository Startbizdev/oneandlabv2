import { Redirect } from 'expo-router';

/** Ancienne route — redirige vers l’accueil avec bottom sheet connexion. */
export default function LoginRedirect() {
  return <Redirect href="/(auth)/welcome" />;
}
