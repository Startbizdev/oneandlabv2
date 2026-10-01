import { ProfileCareTypesSection } from '@/features/profile/components/ProfileCareTypesSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { spacing, AppText, font, useStyles, type Theme } from '@/theme';

export function ProfileNurseCareTypesScreen() {
  const styles = useStyles(buildStyles);
  return (
    <ProfileSubScreenLayout hideSave>
      <AppText style={styles.hint}>Chaque modification est enregistrée automatiquement.</AppText>
      <ProfileCareTypesSection bare />
    </ProfileSubScreenLayout>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    hint: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
      paddingBottom: spacing[1],
    },
  };
}
