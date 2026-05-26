import { HeartPulse, Stethoscope, User } from 'lucide-react-native';
import type { RegisterRole } from '@/features/auth/api/registration.service';

export const REGISTER_META: Record<
  RegisterRole,
  {
    headerTitle: string;
    headerSubtitle: string;
    Icon: typeof User;
    submit: string;
  }
> = {
  patient: {
    headerTitle: 'Patient',
    headerSubtitle: 'Compte pour vos rendez-vous à domicile',
    Icon: User,
    submit: 'Créer mon compte',
  },
  nurse: {
    headerTitle: 'Infirmier(ère)',
    headerSubtitle: 'Rejoindre le réseau Cary',
    Icon: HeartPulse,
    submit: 'Envoyer ma demande',
  },
  pro: {
    headerTitle: 'Professionnel de santé',
    headerSubtitle: 'Professionnel prescripteur',
    Icon: Stethoscope,
    submit: 'Envoyer ma demande',
  },
};
