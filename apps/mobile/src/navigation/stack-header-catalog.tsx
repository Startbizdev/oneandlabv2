import { createElement, type ReactNode } from 'react';
import { useRoute } from '@react-navigation/native';
import { HeaderTitleText } from '@/navigation/HeaderTitle';

export type StackHeaderCatalogEntry = {
  title: string;
};

/** Titres stack — clé = `route.name` expo-router (aligné sur les `_layout`). */
export const STACK_HEADER_CATALOG: Record<string, StackHeaderCatalogEntry> = {
  index: { title: 'Mon profil' },
  menu: { title: 'Compte' },
  personal: { title: 'Informations personnelles' },
  settings: { title: "Paramètres de l'app" },
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
  prescriptions: { title: 'Prescriptions' },
  abonnement: { title: 'Abonnement' },
  'informations-legales': { title: 'Informations légales' },
  web: { title: 'Page web' },
};

export function getStackHeaderCatalogEntry(routeName: string): StackHeaderCatalogEntry | null {
  return STACK_HEADER_CATALOG[routeName] ?? null;
}

export function stackHeaderTitleNode(entry: StackHeaderCatalogEntry): ReactNode {
  return createElement(HeaderTitleText, { title: entry.title });
}

export function useStackHeaderCatalogEntry(): StackHeaderCatalogEntry | null {
  const route = useRoute();
  return getStackHeaderCatalogEntry(route.name);
}
