import type { TutorialConfig } from '../types';

export const NURSE_TUTORIAL: TutorialConfig = {
  role: 'nurse',
  welcomeTitle: 'Bienvenue',
  slides: [
    {
      id: 'welcome',
      title: 'Vos demandes, votre tournée',
      body: 'Les soins à domicile arrivent ici. Planning et patients au même endroit.',
      illustration: 'welcome',
    },
    {
      id: 'demandes',
      title: 'De nouvelles demandes dans votre rayon',
      body: 'Vous acceptez, vous refusez, ou vous proposez un autre horaire.',
      illustration: 'demandes',
    },
    {
      id: 'appointments',
      title: 'Chaque visite a sa fiche',
      body: 'Patient, adresse, documents, et un fil pour échanger.',
      illustration: 'appointments',
    },
    {
      id: 'calendar',
      title: 'Votre journée, d’un coup d’œil',
      body: 'Pour enchaîner les passages sans perdre de temps.',
      illustration: 'calendar',
    },
    {
      id: 'patients',
      title: 'Vos patients restent sous la main',
      body: 'Historique, coordonnées, documents.',
      illustration: 'patients',
    },
    {
      id: 'qr',
      title: 'Vos patients peuvent venir à vous',
      body: 'Envoyez votre lien ou votre QR. Ils réservent chez vous. L’offre Pro élargit votre rayon quand vous êtes prêt.',
      illustration: 'qr',
    },
  ],
};
