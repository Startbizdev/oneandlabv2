import type { TutorialConfig } from '../types';

export const PATIENT_TUTORIAL: TutorialConfig = {
  role: 'patient',
  welcomeTitle: 'Bienvenue sur Cary',
  slides: [
    {
      id: 'welcome',
      title: 'Vos soins à domicile',
      body: 'Cary vous met en relation avec des infirmiers et des laboratoires pour des prises de sang et soins chez vous.',
      illustration: 'welcome',
    },
    {
      id: 'appointments',
      title: 'Mes rendez-vous',
      body: 'Suivez vos RDV en cours, consultez le détail, vos documents et l’historique depuis le premier onglet.',
      illustration: 'appointments',
    },
    {
      id: 'book',
      title: 'Réserver un soin',
      body: 'Choisissez le type de soin, le créneau qui vous convient et ajoutez vos pièces jointes en quelques étapes.',
      illustration: 'book',
    },
    {
      id: 'relatives',
      title: 'Mes proches',
      body: 'Enregistrez un membre de votre famille pour réserver à sa place et centraliser ses documents médicaux.',
      illustration: 'relatives',
    },
    {
      id: 'ai',
      title: 'Assistant Cary',
      body: 'Posez vos questions, préparez un rendez-vous ou retrouvez une information sur votre suivi.',
      illustration: 'ai',
    },
    {
      id: 'notifications',
      title: 'Restez informé',
      body: 'La cloche et les notifications push vous alertent à chaque étape : confirmation, rappel, résultats.',
      illustration: 'notifications',
    },
  ],
};
