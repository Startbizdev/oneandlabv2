import { Linking, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { ErrorState } from '@/components/ui/ErrorState';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { SheetModal, PROFILE_SHEET_SNAP_POINTS } from '@/components/ui/SheetModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import {
  PublicProfileContactActions,
  PublicProfileInfoCard,
  PublicProfileLinks,
  PublicProfileSection,
} from '@/features/profile/components/public-profile/PublicProfileParts';
import { openingHoursRows } from '@/features/profile/utils/opening-hours-display';
import { queryKeys } from '@/lib/query-keys';
import { AppText, radius, spacing, useStyles } from '@/theme';
import { fetchPharmacyPublicProfile } from '../api/pharmacy-orders.service';

const DAY_LABELS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface Props {
  pharmacyId: string | null;
  title?: string;
  onClose: () => void;
}

function dayList(days: number[]): string {
  return days
    .map((day) => DAY_LABELS[day] ?? '')
    .filter(Boolean)
    .join(', ');
}

export function PharmacyPublicProfileSheet({ pharmacyId, title, onClose }: Props) {
  const styles = useStyles(buildStyles);
  const id = pharmacyId?.trim() ?? '';
  const profileQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.pharmacy(id),
    queryFn: () => fetchPharmacyPublicProfile(id),
    enabled: id !== '',
    staleTime: 60_000,
  });

  const profile = profileQ.data;
  const displayName = profile?.display_name?.trim() || title?.trim() || 'Pharmacie';
  const address = profile?.address_label?.trim() || null;
  const maps = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
  const serviceRows = [
    profile?.accepts_click_collect
      ? { key: 'collect', label: 'Retrait en pharmacie', value: dayList(profile.click_collect_days) }
      : null,
    profile?.accepts_home_delivery
      ? { key: 'delivery', label: 'Livraison', value: dayList(profile.home_delivery_days) }
      : null,
  ].filter((row): row is { key: string; label: string; value: string } => row !== null);

  return (
    <SheetModal visible={id !== ''} onClose={onClose} title="Pharmacie" snapPoints={PROFILE_SHEET_SNAP_POINTS}>
      {profileQ.isLoading ? (
        <View style={styles.body} accessibilityLabel="Chargement de la pharmacie">
          <Skeleton height={120} borderRadius={radius.lg} />
          <Skeleton width="60%" height={24} />
        </View>
      ) : null}
      {profileQ.isError ? (
        <ErrorState title="Pharmacie indisponible" error={profileQ.error} onRetry={() => void profileQ.refetch()} />
      ) : null}
      {profile ? (
        <View style={styles.body}>
          <ProfileHero
            name={displayName}
            seed={profile.id}
            subtitle={profile.emploi?.trim() || 'Pharmacie'}
            profileImageUrl={profile.profile_image_url}
            coverImageUrl={profile.cover_image_url}
            showCover
          />
          <PublicProfileContactActions phone={profile.phone} />
          {profile.phone ? <AppText variant="secondary">{profile.phone}</AppText> : null}
          {profile.biography?.trim() ? (
            <PublicProfileSection title="Présentation">
              <AppText variant="body">{profile.biography.trim()}</AppText>
            </PublicProfileSection>
          ) : null}
          {address ? (
            <SettingsSection
              title="Adresse"
              items={[
                {
                  icon: MapPin,
                  label: address,
                  description: 'Itinéraire',
                  onPress: () => void Linking.openURL(maps),
                },
              ]}
            />
          ) : null}
          <PublicProfileInfoCard title="Retrait et livraison" rows={serviceRows} />
          <PublicProfileInfoCard title="Heures d'ouverture" rows={openingHoursRows(profile.opening_hours)} />
          <PublicProfileLinks website={profile.website_url} social={profile.social_links} />
        </View>
      ) : null}
    </SheetModal>
  );
}

function buildStyles() {
  return {
    body: { gap: spacing[6], paddingBottom: spacing[4] },
  };
}
