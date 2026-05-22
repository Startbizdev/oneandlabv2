import { StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { ProfileNurseView } from '@/features/profile/views/ProfileNurseView';
import { ProfilePatientView } from '@/features/profile/views/ProfilePatientView';
import { ProfilePreleveurView } from '@/features/profile/views/ProfilePreleveurView';
import { ProfileProView } from '@/features/profile/views/ProfileProView';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/**
 * Profil unifié par rôle — une seule page scrollable, sans doublons avatar / liens redondants.
 */
export function ProfileScreen() {
  const role = useAuthStore((s) => s.user?.role);

  if (role === 'nurse') return <ProfileNurseView />;
  if (role === 'patient') return <ProfilePatientView />;
  if (role === 'pro') return <ProfileProView />;
  if (role === 'preleveur') return <ProfilePreleveurView />;

  return (
    <View style={styles.container}>
      <Text style={styles.error}>Profil non disponible pour ce compte.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing[4],
    justifyContent: 'center',
  },
  error: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
