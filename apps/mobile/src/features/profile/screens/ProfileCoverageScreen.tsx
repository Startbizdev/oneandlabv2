import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProfileCoverageEditor } from '@/features/profile/components/ProfileCoverageEditor';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfileCoverageScreen() {
  const styles = useThemedStyles(buildStyles, 'features_profile_screens_ProfileCoverageScreen_tsx_ProfileCoverageScreen_styles');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Définissez le rayon d'intervention autour de votre adresse professionnelle.
        </Text>
        <ProfileCoverageEditor />
      </ScrollView>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  scroll: { minWidth: 0, flex: 1 },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
};
}
