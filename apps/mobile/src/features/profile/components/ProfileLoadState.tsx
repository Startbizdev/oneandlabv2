import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';

export function ProfileLoadState({ loading, refreshing, error, onRetry }: {
  loading?: boolean;
  refreshing?: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  if (loading || refreshing) return <SkeletonProfileScreen cards={2} />;
  return <ProfileSubScreenLayout hideSave>
    <ErrorState title="Profil indisponible" error={error} onRetry={onRetry} />
  </ProfileSubScreenLayout>;
}
