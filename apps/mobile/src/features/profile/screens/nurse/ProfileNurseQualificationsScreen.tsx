import { Text } from 'react-native';
import { ProfileNurseQualificationsSection } from '@/features/profile/components/ProfileNurseQualificationsSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfileNurseQualificationsScreen() {
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
      <ProfileNurseQualificationsSection bare />
    </ProfileSubScreenLayout>
  );
}
