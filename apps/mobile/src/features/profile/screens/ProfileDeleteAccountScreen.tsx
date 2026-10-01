import { useAuthStore } from '@/store/auth-store';
import { AppText } from '@/theme';
import { DeleteAccountPatientPanel } from '../components/DeleteAccountPatientPanel';
import { DeleteAccountRequestPanel } from '../components/DeleteAccountRequestPanel';
import { ProfileSubScreenLayout } from './ProfileSubScreenLayout';

export function ProfileDeleteAccountScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const isPatient = role === 'patient';

  return (
    <ProfileSubScreenLayout hideSave>
      <AppText variant="secondary">
        {isPatient
          ? 'La suppression est immédiate depuis l’application.'
          : 'La suppression d’un compte professionnel est traitée par notre équipe.'}
      </AppText>
      {isPatient ? <DeleteAccountPatientPanel /> : <DeleteAccountRequestPanel />}
    </ProfileSubScreenLayout>
  );
}
