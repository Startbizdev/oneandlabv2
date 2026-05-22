import { Redirect } from 'expo-router';
import { ProfileDocumentsScreen } from '@/features/profile/screens/ProfileDocumentsScreen';
import { useAuthStore } from '@/store/auth-store';
import { isPatientProfileRole } from '@/constants/profile-sections';

/** Documents médicaux — réservés au patient (web : patient uniquement). */
export default function ProfileDocumentsRoute() {
  const role = useAuthStore((s) => s.user?.role);
  if (!isPatientProfileRole(role)) {
    return <Redirect href="/profile" />;
  }
  return <ProfileDocumentsScreen />;
}
