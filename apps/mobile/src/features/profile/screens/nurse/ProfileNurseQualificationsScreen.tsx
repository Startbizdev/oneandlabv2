import { ProfileNurseQualificationsSection } from '@/features/profile/components/ProfileNurseQualificationsSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';

export function ProfileNurseQualificationsScreen() {
  return (
    <ProfileSubScreenLayout hideSave>
      <ProfileNurseQualificationsSection />
    </ProfileSubScreenLayout>
  );
}
