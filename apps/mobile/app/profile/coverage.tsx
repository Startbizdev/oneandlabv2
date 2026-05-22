import { Redirect } from 'expo-router';

/** Ancienne route — redirige vers l’écran dédié infirmier. */
export default function ProfileCoverageRoute() {
  return <Redirect href="/profile/nurse/coverage" />;
}
