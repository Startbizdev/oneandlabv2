import { Redirect } from 'expo-router';

/** Ancienne route : paramètres fusionnés dans « Présentation ». */
export default function NurseSettingsRoute() {
  return <Redirect href="/profile/nurse/presentation" />;
}
