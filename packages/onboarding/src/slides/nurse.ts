import type { TutorialConfig } from '../types';

export const NURSE_TUTORIAL: TutorialConfig = {
  role: 'nurse',
  welcomeTitle: 'Bienvenue, infirmier·ère',
  slides: [
    {
      id: 'welcome',
      title: 'Votre activité Cary',
      body: 'Recevez des demandes de soins à domicile, gérez votre planning et vos patients depuis une seule app.',
      illustration: 'welcome',
    },
    {
      id: 'demandes',
      title: 'Demandes à traiter',
      body: 'Consultez les nouvelles demandes dans votre zone, acceptez ou refusez en un geste.',
      illustration: 'demandes',
    },
    {
      id: 'appointments',
      title: 'Mes rendez-vous',
      body: 'Accédez au détail de chaque soin : patient, adresse, documents et messagerie d’échange.',
      illustration: 'appointments',
    },
    {
      id: 'calendar',
      title: 'Calendrier',
      body: 'Visualisez votre journée et vos prochains passages pour organiser vos tournées.',
      illustration: 'calendar',
    },
    {
      id: 'patients',
      title: 'Mes patients',
      body: 'Retrouvez l’historique, les coordonnées et les documents de vos patients suivis.',
      illustration: 'patients',
    },
    {
      id: 'qr',
      title: 'QR code & abonnement',
      body: 'Partagez votre QR aux patients et gérez votre offre Cary Pro depuis le menu Plus.',
      illustration: 'qr',
    },
  ],
};
