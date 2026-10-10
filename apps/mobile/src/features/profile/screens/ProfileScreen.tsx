import { View } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { ProfileLabLinksView } from '@/features/profile/views/ProfileLabLinksView';
import { ProfileNurseHubView } from '@/features/profile/views/ProfileNurseHubView';
import { ProfilePatientView } from '@/features/profile/views/ProfilePatientView';
import { ProfilePreleveurView } from '@/features/profile/views/ProfilePreleveurView';
import { ProfileProView } from '@/features/profile/views/ProfileProView';
import { spacing, AppText, useStyles, type Theme } from '@/theme';

/** « Mon profil » : une vue par rôle. */
export function ProfileScreen() {
  const styles = useStyles(buildStyles);
  const role = useAuthStore((s) => s.user?.role);

  if (role === 'nurse') return <ProfileNurseHubView />;
  if (role === 'patient') return <ProfilePatientView />;
  if (role === 'pro') return <ProfileProView />;
  if (role === 'preleveur') return <ProfilePreleveurView />;
  if (role === 'lab' || role === 'subaccount') return <ProfileLabLinksView />;

  return (
    <View style={styles.container}>
      <AppText variant="secondary" style={styles.centered}>
        Profil non disponible pour ce compte.
      </AppText>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    container: {
      minWidth: 0,
      flex: 1,
      backgroundColor: c.background,
      padding: spacing[4],
      justifyContent: 'center' as const,
    },
    centered: { textAlign: 'center' as const },
  };
}
