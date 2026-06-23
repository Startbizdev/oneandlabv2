import type { TutorialConfig } from '../types';

export const PRO_TUTORIAL: TutorialConfig = {
  role: 'pro',
  welcomeTitle: 'Bienvenue, docteur',
  slides: [
    {
      id: 'welcome',
      title: 'Cary pour votre cabinet',
      body: 'Planifiez des prélèvements et soins à domicile pour vos patients en quelques clics.',
      illustration: 'welcome',
    },
    {
      id: 'appointments',
      title: 'Rendez-vous',
      body: 'Créez, suivez et modifiez les RDV de vos patients. Chaque dossier centralise les infos utiles.',
      illustration: 'appointments',
    },
    {
      id: 'patients',
      title: 'Patients',
      body: 'Recherchez un patient, consultez son historique et ses documents médicaux.',
      illustration: 'patients',
    },
    {
      id: 'prescriptions',
      title: 'Prescriptions',
      body: 'Rédigez et signez des ordonnances numériques liées à un patient ou à un rendez-vous.',
      illustration: 'prescriptions',
    },
    {
      id: 'calendar',
      title: 'Calendrier',
      body: 'Anticipez les passages programmés et gardez une vue claire sur votre activité.',
      illustration: 'calendar',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      body: 'La cloche vous informe des nouveaux RDV, messages et mises à jour importantes.',
      illustration: 'notifications',
    },
  ],
};
