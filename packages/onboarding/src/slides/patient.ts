import type { TutorialConfig } from '../types';

export const PATIENT_TUTORIAL: TutorialConfig = {
  role: 'patient',
  welcomeTitle: 'Bienvenue',
  slides: [
    {
      id: 'welcome',
      title: 'Un soignant vient chez vous',
      body: 'Prise de sang ou soin infirmier, sans file d’attente ni trajet.',
      illustration: 'welcome',
    },
    {
      id: 'appointments',
      title: 'Vos rendez-vous, au même endroit',
      body: 'Date, adresse, documents et messages : ouvrez simplement la visite.',
      illustration: 'appointments',
    },
    {
      id: 'book',
      title: 'Réserver prend quelques minutes',
      body: 'Vous choisissez le soin et l’horaire. Nous trouvons le professionnel.',
      illustration: 'book',
    },
    {
      id: 'relatives',
      title: 'Vous réservez aussi pour un proche',
      body: 'Famille ou personne aidée : sa fiche et ses documents restent groupés.',
      illustration: 'relatives',
    },
    {
      id: 'ai',
      title: 'Une question ? Demandez à Cary',
      body: 'Préparer une visite, retrouver une information, se faire expliquer une étape.',
      illustration: 'ai',
    },
    {
      id: 'notifications',
      title: 'On vous prévient',
      body: 'Confirmation, rappel, résultats : une alerte à chaque étape importante.',
      illustration: 'notifications',
    },
  ],
};
