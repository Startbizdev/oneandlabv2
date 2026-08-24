import type { TutorialConfig } from '../types';

export const PRELEVEUR_TUTORIAL: TutorialConfig = {
  role: 'preleveur',
  welcomeTitle: 'Bienvenue',
  slides: [
    {
      id: 'welcome',
      title: 'Votre journée de prélèvements',
      body: 'Les visites du jour, dans l’ordre de votre tournée.',
      illustration: 'welcome',
    },
    {
      id: 'appointments',
      title: 'Vos visites',
      body: 'Adresse, horaire, statut. Ouvrez la fiche pour le détail.',
      illustration: 'appointments',
    },
    {
      id: 'tournee',
      title: 'La tournée',
      body: 'L’ordre des passages, et vous mettez à jour au fur et à mesure.',
      illustration: 'tournee',
    },
    {
      id: 'calendar',
      title: 'La semaine',
      body: 'Vos créneaux à venir, d’un coup d’œil.',
      illustration: 'calendar',
    },
    {
      id: 'notifications',
      title: 'On vous prévient',
      body: 'Nouveau rendez-vous, changement de dernière minute.',
      illustration: 'notifications',
    },
  ],
};
