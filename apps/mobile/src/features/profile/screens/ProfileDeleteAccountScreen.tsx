import { useAuthStore } from '@/store/auth-store';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { DeleteAccountPatientPanel } from '../components/DeleteAccountPatientPanel';
import { DeleteAccountRequestPanel } from '../components/DeleteAccountRequestPanel';
import { ProfileSubScreenLayout } from './ProfileSubScreenLayout';

export function ProfileDeleteAccountScreen() {
  const styles = useStyles(buildStyles);
  const role = useAuthStore((s) => s.user?.role);
  const isPatient = role === 'patient';

  return (
    <ProfileSubScreenLayout hideSave>
      <AppText style={styles.lead}>
        {isPatient
          ? 'Vous pouvez supprimer votre compte Cary immédiatement depuis l’application.'
          : 'La suppression d’un compte professionnel est traitée par notre équipe, sur demande.'}
      </AppText>
      {isPatient ? <DeleteAccountPatientPanel /> : <DeleteAccountRequestPanel />}
    </ProfileSubScreenLayout>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    lead: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: fontSize.base * 1.5,
      color: c.textSecondary,
      marginBottom: spacing[1],
    },
  };
}
