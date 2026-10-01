import { ScrollView, View } from 'react-native';
import { ProfileCoverageEditor } from '@/features/profile/components/ProfileCoverageEditor';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

export function ProfileCoverageScreen() {
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppText style={styles.subtitle}>
          Ajustez les quartiers où vous intervenez autour de votre adresse professionnelle.
        </AppText>
        <ProfileCoverageEditor />
      </ScrollView>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  scroll: { minWidth: 0, flex: 1 },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  subtitle: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
};
}
