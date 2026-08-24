import type { TutorialConfig } from '../types';

export const PRO_TUTORIAL: TutorialConfig = {
  role: 'pro',
  welcomeTitle: 'Bienvenue',
  slides: [
    {
      id: 'welcome',
      title: 'Le domicile, sans le casse-tête',
      body: 'Vous lancez une prise de sang ou un soin pour un patient. Il reste chez lui.',
      illustration: 'welcome',
    },
    {
      id: 'appointments',
      title: 'Chaque dossier au même endroit',
      body: 'Créer, suivre, modifier. Les informations utiles sont sur la visite.',
      illustration: 'appointments',
    },
    {
      id: 'patients',
      title: 'Vos patients',
      body: 'Recherche, historique, documents.',
      illustration: 'patients',
    },
    {
      id: 'prescriptions',
      title: 'Ordonnances',
      body: 'Vous rédigez, vous signez, c’est lié au patient ou à la visite.',
      illustration: 'prescriptions',
    },
    {
      id: 'calendar',
      title: 'La semaine à venir',
      body: 'Les passages prévus, pour garder une vue claire.',
      illustration: 'calendar',
    },
    {
      id: 'notifications',
      title: 'On vous prévient',
      body: 'Nouveau rendez-vous, message, changement important.',
      illustration: 'notifications',
    },
  ],
};
