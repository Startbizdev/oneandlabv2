import { useAppColors } from '@/theme/use-app-colors';
;
import { ProfileCareTypesSection } from '@/features/profile/components/ProfileCareTypesSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfileNurseCareTypesScreen() {
  const c = useAppColors();
  return (
    <ProfileSubScreenLayout hideSave>
      <AppText
        style={{
          fontFamily: fontFamily.regular,
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
