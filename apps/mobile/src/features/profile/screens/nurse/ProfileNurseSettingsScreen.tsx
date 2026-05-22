import { Redirect } from 'expo-router';

/** Paramètres fusionnés dans Présentation — redirection pour anciens liens. */
export function ProfileNurseSettingsScreen() {
  return <Redirect href="/profile/nurse/presentation" />;
}
