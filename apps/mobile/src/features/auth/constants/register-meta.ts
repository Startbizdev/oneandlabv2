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
    headerSubtitle: 'Pour réserver et suivre vos visites chez vous',
    Icon: User,
    submit: 'Créer mon compte',
  },
  nurse: {
    headerTitle: 'Infirmier ou infirmière',
    headerSubtitle: 'Recevoir des demandes dans votre rayon',
    Icon: HeartPulse,
    submit: 'Envoyer ma demande',
  },
  pro: {
    headerTitle: 'Médecin ou soignant',
    headerSubtitle: 'Orienter vos patients vers le domicile',
    Icon: Stethoscope,
    submit: 'Envoyer ma demande',
  },
};
