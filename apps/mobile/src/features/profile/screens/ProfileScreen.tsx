import { View } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { ProfileNurseView } from '@/features/profile/views/ProfileNurseView';
import { ProfilePatientView } from '@/features/profile/views/ProfilePatientView';
import { ProfilePreleveurView } from '@/features/profile/views/ProfilePreleveurView';
import { ProfileProView } from '@/features/profile/views/ProfileProView';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

/**
 * Profil unifié par rôle — une seule page scrollable, sans doublons avatar / liens redondants.
 */
export function ProfileScreen() {
  const styles = useStyles(buildStyles);

  const role = useAuthStore((s) => s.user?.role);

  if (role === 'nurse') return <ProfileNurseView />;
  if (role === 'patient') return <ProfilePatientView />;
  if (role === 'pro') return <ProfileProView />;
  if (role === 'preleveur') return <ProfilePreleveurView />;

  return (
    <View style={styles.container}>
      <AppText style={styles.error}>Profil non disponible pour ce compte.</AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  container: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
    padding: spacing[4],
    justifyContent: 'center' as const,
  },
  error: {
    ...font.regular,
    fontSize: fontSize.base,
    color: c.textSecondary,
    textAlign: 'center' as const,
  },
};
}
