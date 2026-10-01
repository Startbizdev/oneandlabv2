import { useRoute } from '@react-navigation/native';

export type StackHeaderCatalogEntry = {
  title: string;
};

/**
 * Source unique des titres stack — clé = `route.name` expo-router, partagée entre rôles.
 * Un titre propre à un rôle se passe en prop `title` de `StackChromeScreen`.
 */
export const STACK_HEADER_CATALOG: Record<string, StackHeaderCatalogEntry> = {
  index: { title: 'Mon profil' },
  menu: { title: 'Compte' },
  settings: { title: 'Paramètres' },
  'help/index': { title: "Centre d'aide" },
  'help/[slug]': { title: 'Aide' },
  support: { title: 'Contacter le support' },
  security: { title: 'Mot de passe et connexion' },
  documents: { title: 'Mes documents' },
  'nurse/coordinates': { title: 'Coordonnées' },
  'nurse/presentation': { title: 'Présentation' },
  'nurse/settings': { title: 'Paramètres' },
  'nurse/qualifications': { title: 'Diplômes et formations' },
  'nurse/care-types': { title: 'Types de soins' },
  'nurse/coverage': { title: 'Zone de couverture' },
  reviews: { title: 'Mes avis' },
  'qr-code': { title: 'QR code' },
  resultats: { title: 'Résultats' },
  notifications: { title: 'Notifications' },
  'appointment/[id]': { title: 'Détail du rendez-vous' },
  'appointment/[id]/history': { title: 'Historique' },
  'appointment/[id]/edit': { title: 'Nouveau créneau' },
  'relatives/index': { title: 'Mes proches' },
  'relatives/[id]': { title: 'Proche' },
  'relatives/[id]/documents': { title: 'Documents' },
  'patient/[id]': { title: 'Patient' },
  'patient/[id]/history': { title: 'Historique' },
  'patient/[id]/documents': { title: 'Documents' },
  'patient/[id]/health-record': { title: 'Carnet de santé' },
  prescriptions: { title: 'Prescriptions' },
  abonnement: { title: 'Abonnement' },
  'informations-legales': { title: 'Informations légales' },
  web: { title: 'Page web' },
  'appointment/[id]/conversation': { title: 'Messages' },
  'appointment/[id]/exchange': { title: 'Suivi des soins' },
  'appointment/[id]/care-photo/[photoId]': { title: 'Suivi des soins' },
  'appointment/[id]/prescription': { title: 'Prescription' },
  'passage/new': { title: 'Prise en charge' },
  'passage/patient-pick': { title: 'Choisir un patient' },
  'passage/[seriesId]': { title: 'Détail passage' },
  'professionnel/[id]': { title: 'Professionnel' },
  'commandes-pharmacie/index': { title: 'Commandes pharmacie' },
  'commandes-pharmacie/new': { title: 'Nouvelle commande' },
  'commandes-pharmacie/[id]': { title: 'Détail commande' },
  'commandes-pharmacie/[id]/ordonnances': { title: 'Ordonnances' },
  'commandes-recues/index': { title: 'Commandes reçues' },
  'commandes-recues/[id]': { title: 'Commande reçue' },
  'commandes-recues/[id]/ordonnances': { title: 'Ordonnances' },
  'traitements/index': { title: 'Mes traitements' },
  'traitements/[id]': { title: 'Détail du traitement' },
  'health-data': { title: 'Mes données santé' },
  'health-record/index': { title: 'Mon carnet de santé' },
  'health-record/wizard': { title: 'Compléter mon carnet' },
  'pharmacy-settings': { title: 'Réglages de l’officine' },
  'care-origins': { title: 'Mes donneurs de soins' },
  'delete-account': { title: 'Supprimer mon compte' },
  merci: { title: 'Confirmation' },
};

export function useStackHeaderCatalogEntry(): StackHeaderCatalogEntry | null {
  const route = useRoute();
  return STACK_HEADER_CATALOG[route.name] ?? null;
}
