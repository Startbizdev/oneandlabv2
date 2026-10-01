import { Redirect } from 'expo-router';

/** Ancienne route : les préférences de soins sont dans « Mon profil ». */
export default function ProfilePreferencesRoute() {
  return <Redirect href="/profile" />;
}
