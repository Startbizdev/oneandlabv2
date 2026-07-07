import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { ProfileDocumentsEmbedded } from '@/features/profile/screens/ProfileDocumentsScreen';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Bloc documents médicaux patient — aligné web `ProfileDocuments` sur /patient/profile */
export function ProfileDocumentsSection() {
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileDocumentsSection_tsx_ProfileDocumentsSection_styles');

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInDown.delay(240).duration(280).springify()}>
        <AppText style={styles.sectionTitle}>Documents médicaux</AppText>
        <AppText style={styles.sectionHint}>
          Carte Vitale, mutuelle et autres assurances — l’ordonnance se gère sur chaque rendez-vous.
        </AppText>
      </Animated.View>
      <ProfileDocumentsEmbedded />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  sectionHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    marginBottom: spacing[2],
  },
};
}
