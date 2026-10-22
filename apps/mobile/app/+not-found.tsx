import { Redirect } from 'expo-router';

/** Adresse du site sans écran dans l'app (bannière Safari, lien partagé) : retour à l'accueil du rôle. */
export default function NotFound() {
  return <Redirect href="/" />;
}
