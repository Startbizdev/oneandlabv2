import { createElement, type ReactNode } from 'react';
import { useRoute } from '@react-navigation/native';
import type { LucideIcon } from 'lucide-react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import {
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  History,
  LifeBuoy,
  Lock,
  MapPin,
  QrCode,
  Route,
  Settings,
  Star,
  User,
  Users,
} from 'lucide-react-native';
import { PROFILE_HEADER_SF, TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { HeaderTitleText } from '@/navigation/HeaderTitle';

export type StackHeaderCatalogEntry = {
  title: string;
  symbol?: SFSymbol;
  fallbackIcon?: LucideIcon;
};

/** Titres stack — clé = `route.name` expo-router (aligné sur les `_layout`). */
export const STACK_HEADER_CATALOG: Record<string, StackHeaderCatalogEntry> = {
  index: { title: 'Mon profil', symbol: PROFILE_HEADER_SF.profile, fallbackIcon: User },
  menu: { title: 'Compte', symbol: PROFILE_HEADER_SF.account, fallbackIcon: User },
  personal: {
    title: 'Informations personnelles',
    symbol: PROFILE_HEADER_SF.personal,
    fallbackIcon: User,
  },
  settings: {
    title: "Paramètres de l'app",
    symbol: PROFILE_HEADER_SF.settings,
    fallbackIcon: Settings,
  },
  'help/index': { title: "Centre d'aide", symbol: PROFILE_HEADER_SF.help, fallbackIcon: HelpCircle },
  'help/[slug]': { title: 'Aide', symbol: PROFILE_HEADER_SF.help, fallbackIcon: HelpCircle },
  support: { title: 'Contacter le support', symbol: PROFILE_HEADER_SF.support, fallbackIcon: LifeBuoy },
  security: { title: 'Mot de passe et connexion', symbol: PROFILE_HEADER_SF.security, fallbackIcon: Lock },
  documents: { title: 'Documents', symbol: PROFILE_HEADER_SF.documents, fallbackIcon: FileText },
  'nurse/coordinates': {
    title: 'Coordonnées',
    symbol: PROFILE_HEADER_SF.coordinates,
    fallbackIcon: FileText,
  },
  'nurse/presentation': {
    title: 'Présentation',
    symbol: PROFILE_HEADER_SF.presentation,
    fallbackIcon: Globe,
  },
  'nurse/settings': {
    title: 'Paramètres',
    symbol: PROFILE_HEADER_SF.nurseSettings,
    fallbackIcon: Settings,
  },
  'nurse/qualifications': {
    title: 'Diplômes et formations',
    symbol: PROFILE_HEADER_SF.qualifications,
    fallbackIcon: GraduationCap,
  },
  'nurse/care-types': {
    title: 'Types de soins',
    symbol: PROFILE_HEADER_SF.careTypes,
    fallbackIcon: HeartPulse,
  },
  'nurse/coverage': {
    title: 'Zone de couverture',
    symbol: PROFILE_HEADER_SF.coverage,
    fallbackIcon: MapPin,
  },
  reviews: { title: 'Mes avis', symbol: PROFILE_HEADER_SF.reviews, fallbackIcon: Star },
  'qr-code': { title: 'QR code', symbol: PROFILE_HEADER_SF.qrCode, fallbackIcon: QrCode },
  resultats: { title: 'Résultats', symbol: 'doc.text.magnifyingglass', fallbackIcon: FileText },
  notifications: {
    title: 'Notifications',
    symbol: TAB_HEADER_SF.notifications,
    fallbackIcon: Bell,
  },
  'appointment/[id]': {
    title: 'Détail du rendez-vous',
    symbol: TAB_HEADER_SF.appointments,
    fallbackIcon: CalendarDays,
  },
  'appointment/[id]/history': { title: 'Historique', symbol: 'clock.arrow.circlepath', fallbackIcon: History },
  'appointment/[id]/edit': {
    title: 'Reprendre le RDV',
    symbol: 'calendar.badge.clock',
    fallbackIcon: CalendarDays,
  },
  'relatives/[id]': { title: 'Proche', symbol: TAB_HEADER_SF.relatives, fallbackIcon: User },
  'relatives/[id]/documents': {
    title: 'Documents',
    symbol: PROFILE_HEADER_SF.documents,
    fallbackIcon: FileText,
  },
  'patient/[id]': { title: 'Patient', symbol: TAB_HEADER_SF.patients, fallbackIcon: Users },
  'patient/[id]/history': { title: 'Historique', symbol: 'clock.arrow.circlepath', fallbackIcon: History },
  'patient/[id]/documents': {
    title: 'Documents',
    symbol: PROFILE_HEADER_SF.documents,
    fallbackIcon: FileText,
  },
  prescriptions: { title: 'Prescriptions', symbol: TAB_HEADER_SF.prescriptions, fallbackIcon: ClipboardList },
  abonnement: { title: 'Abonnement', symbol: 'creditcard', fallbackIcon: CreditCard },
  'informations-legales': { title: 'Informations légales', symbol: 'scalemass', fallbackIcon: FileText },
  web: { title: 'Page web', symbol: 'globe', fallbackIcon: Globe },
  'tournee/index': { title: 'Ma tournée', symbol: 'point.topleft.down.to.point.bottomright.curvepath', fallbackIcon: Route },
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
