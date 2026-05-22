import { Text } from 'react-native';
import { ProfileCareTypesSection } from '@/features/profile/components/ProfileCareTypesSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfileNurseCareTypesScreen() {
  return (
    <ProfileSubScreenLayout hideSave>
      <Text
        style={{
          fontFamily: fontFamily.regular,
          fontSize: fontSize.sm,
          color: colors.textSecondary,
          lineHeight: fontSize.sm * 1.45,
          paddingBottom: spacing[1],
        }}
      >
        Chaque modification est enregistrée automatiquement.
      </Text>
      <ProfileCareTypesSection bare />
    </ProfileSubScreenLayout>
  );
}
