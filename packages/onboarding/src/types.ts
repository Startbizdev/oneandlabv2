export type TutorialRole = 'patient' | 'nurse' | 'pro' | 'preleveur';

export type TutorialIllustrationKey =
  | 'welcome'
  | 'appointments'
  | 'book'
  | 'relatives'
  | 'ai'
  | 'notifications'
  | 'demandes'
  | 'calendar'
  | 'patients'
  | 'qr'
  | 'prescriptions'
  | 'tournee';

export type TutorialSlide = {
  id: string;
  title: string;
  body: string;
  illustration: TutorialIllustrationKey;
};

export type TutorialConfig = {
  role: TutorialRole;
  welcomeTitle: string;
  slides: TutorialSlide[];
};

export type GetTutorialSlidesOptions = {
  showPrescriptions?: boolean;
};
