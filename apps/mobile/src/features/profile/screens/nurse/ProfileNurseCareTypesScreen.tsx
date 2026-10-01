import { useAppColors } from '@/theme/use-app-colors';
;
import { ProfileCareTypesSection } from '@/features/profile/components/ProfileCareTypesSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { spacing, AppText, font } from '@/theme';
import { fontSize } from '@/theme/typography';

export function ProfileNurseCareTypesScreen() {
  const c = useAppColors();
  return (
    <ProfileSubScreenLayout hideSave>
      <AppText
        style={{
          ...font.regular,
          fontSize: fontSize.sm,
          color: c.textSecondary,
          lineHeight: fontSize.sm * 1.45,
          paddingBottom: spacing[1],
        }}
      >
        Chaque modification est enregistrée automatiquement.
      </AppText>
      <ProfileCareTypesSection bare />
    </ProfileSubScreenLayout>
  );
}
