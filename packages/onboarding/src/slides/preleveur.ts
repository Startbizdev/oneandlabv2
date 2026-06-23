import type { TutorialConfig } from '../types';

export const PRELEVEUR_TUTORIAL: TutorialConfig = {
  role: 'preleveur',
  welcomeTitle: 'Bienvenue, préleveur·se',
  slides: [
    {
      id: 'welcome',
      title: 'Vos prélèvements Cary',
      body: 'Consultez vos rendez-vous du jour et organisez vos tournées de prélèvement à domicile.',
      illustration: 'welcome',
    },
    {
      id: 'appointments',
      title: 'Mes rendez-vous',
      body: 'Liste des RDV assignés avec adresse, créneau et statut. Ouvrez la fiche pour plus de détails.',
      illustration: 'appointments',
    },
    {
      id: 'tournee',
      title: 'Tournée',
      body: 'Enchaînez vos passages dans l’ordre optimal et mettez à jour chaque RDV au fur et à mesure.',
      illustration: 'tournee',
    },
    {
      id: 'calendar',
      title: 'Calendrier',
      body: 'Planifiez votre semaine et visualisez les créneaux à venir.',
      illustration: 'calendar',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      body: 'Recevez les alertes de nouveaux RDV et les changements de dernière minute.',
      illustration: 'notifications',
    },
  ],
};
