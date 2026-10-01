import { ProfileDocumentsEmbedded } from '@/features/profile/screens/ProfileDocumentsScreen';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

/** Bloc documents médicaux patient — aligné web `ProfileDocuments` sur /patient/profile */
export function ProfileDocumentsSection() {
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInDown.delay(240).duration(280).springify()}>
        <AppText style={styles.sectionTitle}>Documents médicaux</AppText>
        <AppText style={styles.sectionHint}>
          Vitale, mutuelle, attestation de droits / AME — l’ordonnance se gère sur chaque rendez-vous.
        </AppText>
      </Animated.View>
      <ProfileDocumentsEmbedded />
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrap: { gap: spacing[2] },
  sectionTitle: {
    ...font.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  sectionHint: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    marginBottom: spacing[2],
  },
};
}
