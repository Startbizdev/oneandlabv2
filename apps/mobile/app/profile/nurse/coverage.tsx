import { Redirect } from 'expo-router';
import { ProfileNurseCoverageScreen } from '@/features/profile/screens/nurse/ProfileNurseCoverageScreen';
import { useAuthStore } from '@/store/auth-store';

/** Zone de couverture — infirmier uniquement (backend : CoverageZoneWritePolicy, lecture réservée au propriétaire). */
export default function NurseCoverageRoute() {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'nurse') {
    return <Redirect href="/profile" />;
  }
  return <ProfileNurseCoverageScreen />;
}
