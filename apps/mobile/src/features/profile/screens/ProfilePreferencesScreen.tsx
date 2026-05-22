import { Redirect } from 'expo-router';

/** @deprecated Préférences intégrées au profil infirmier */
export function ProfilePreferencesScreen() {
  return <Redirect href="/profile" />;
}
