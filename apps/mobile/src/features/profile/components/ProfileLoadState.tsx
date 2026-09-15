import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';

export function ProfileLoadState({ loading, refreshing, onRetry }: {
  loading?: boolean;
  refreshing?: boolean;
  onRetry: () => void;
}) {
  if (loading) return <SkeletonProfileScreen cards={2} />;
  return <ProfileSubScreenLayout hideSave>
    <EmptyState title="Profil indisponible" description="Vos informations n’ont pas pu être chargées. Réessayez pour les consulter ou les modifier." />
    <Button title="Réessayer" loading={refreshing} onPress={onRetry} fullWidth />
  </ProfileSubScreenLayout>;
}
