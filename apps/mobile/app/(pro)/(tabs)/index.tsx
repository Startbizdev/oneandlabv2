import { Redirect } from 'expo-router';

/** Ancien accueil pro : redirection vers la liste des RDV (comme infirmier). */
export default function ProTabsIndex() {
  return <Redirect href="/(pro)/(tabs)/appointments" />;
}
