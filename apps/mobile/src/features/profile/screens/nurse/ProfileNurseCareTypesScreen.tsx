import { ProfileCareTypesSection } from '@/features/profile/components/ProfileCareTypesSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';

export function ProfileNurseCareTypesScreen() {
  return (
    <ProfileSubScreenLayout hideSave>
      <ProfileCareTypesSection />
    </ProfileSubScreenLayout>
  );
}
