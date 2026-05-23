import { ProfileDocumentsEmbedded } from '@/features/profile/screens/ProfileDocumentsScreen';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Bloc documents médicaux patient — aligné web `ProfileDocuments` sur /patient/profile */
export function ProfileDocumentsSection() {
  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInDown.delay(240).duration(280).springify()}>
        <Text style={styles.sectionTitle}>Documents médicaux</Text>
        <Text style={styles.sectionHint}>
        Carte Vitale, mutuelle et autres assurances — l’ordonnance se gère sur chaque rendez-vous.
        </Text>
      </Animated.View>
      <ProfileDocumentsEmbedded />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  sectionHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
});
