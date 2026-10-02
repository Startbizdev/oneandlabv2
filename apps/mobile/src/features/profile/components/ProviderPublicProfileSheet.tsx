import { Linking, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { ErrorState } from '@/components/ui/ErrorState';
import { SheetModal, PROFILE_SHEET_SNAP_POINTS } from '@/components/ui/SheetModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { CompactAssigneeRating } from '@/features/appointments/detail/components/CompactAssigneeRating';
import { CareIcon } from '@/features/categories/components/CareIcon';
import { fetchPublicProviderProfile } from '@/features/profile/api/public-profile.service';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { SettingsSection } from '@/components/ui/SettingsSection';
import {
  PublicProfileContactActions,
  PublicProfileInfoCard,
  PublicProfileLinks,
  PublicProfileSection,
} from '@/features/profile/components/public-profile/PublicProfileParts';
import type { PublicLabProfile, PublicNurseProfile } from '@/features/profile/types/public-profile.types';
import { openingHoursRows } from '@/features/profile/utils/opening-hours-display';
import { yearsExperienceLabel } from '@/features/profile/utils/years-experience-label';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import { queryKeys } from '@/lib/query-keys';
import { AppText, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  providerType: 'nurse' | 'lab';
  slug: string;
  /** Nom connu côté RDV, affiché pendant le chargement. */
  title?: string;
  /** Téléphone depuis le RDV (non exposé par l’API publique). */
  phone?: string | null;
}

type PublicProfile = PublicNurseProfile | PublicLabProfile;

function isNurseProfile(profile: PublicProfile, providerType: Props['providerType']): profile is PublicNurseProfile {
  return providerType === 'nurse';
}

function isLabProfile(profile: PublicProfile, providerType: Props['providerType']): profile is PublicLabProfile {
  return providerType === 'lab';
}

function mapsUrl(address?: string | null, mapCenter?: { lat: number; lng: number } | null): string {
  const addr = address?.trim();
  if (addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  }
  if (mapCenter?.lat != null && mapCenter?.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${mapCenter.lat},${mapCenter.lng}`;
  }
  return '';
}

/** « Zone de 20 × 20 km » — la couverture infirmier est un carré de demi-côté `radius_km`. */
function coverageLabel(radiusKm?: number | null): string | undefined {
  if (!radiusKm) return undefined;
  const side = Math.round(radiusKm * 2);
  return `Zone de ${side} × ${side} km`;
}

export function ProviderPublicProfileSheet({ visible, onClose, providerType, slug, title, phone }: Props) {
  const styles = useStyles(buildStyles);
  const trimmedSlug = slug.trim();
  const profileQ = useQuery({
    queryKey: queryKeys.profile.publicProvider(providerType, trimmedSlug),
    queryFn: () => fetchPublicProviderProfile(providerType, trimmedSlug),
    enabled: visible && Boolean(trimmedSlug),
    staleTime: 60_000,
  });

  const profile = profileQ.data;
  const nurse = profile && isNurseProfile(profile, providerType) ? profile : null;
  const lab = profile && isLabProfile(profile, providerType) ? profile : null;
  const displayName = profile?.name?.trim() || title?.trim() || 'Profil';
  const roleLabel = providerType === 'nurse' ? 'Infirmier à domicile' : 'Laboratoire de biologie';
  const reviewStats = profile?.reviews?.stats;
  const reviewItems = profile?.reviews?.items?.slice(0, 3) ?? [];
  const services = nurse?.specializations ?? lab?.services ?? [];
  const hoursRows = openingHoursRows(lab?.opening_hours);
  const qualificationRows = (nurse?.qualifications ?? []).map((q, i) => ({ key: `${q.code}-${i}`, label: q.label }));

  const heroSubtitle = [
    yearsExperienceLabel(nurse?.years_experience),
    nurse
      ? nurse.is_accepting_appointments === false
        ? 'Ne prend pas de nouveaux rendez-vous'
        : 'Accepte de nouveaux rendez-vous'
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const addressLabel = profile?.address?.trim() || profile?.city_plain?.trim() || null;
  const itinerary = mapsUrl(addressLabel, profile?.map_center);
  const coverage = coverageLabel(nurse?.radius_km);

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={roleLabel}
      snapPoints={PROFILE_SHEET_SNAP_POINTS}
    >
      {profileQ.isLoading ? (
        <View style={styles.body} accessibilityLabel="Chargement du profil">
          <Skeleton height={120} borderRadius={radius.lg} />
          <Skeleton width="60%" height={24} style={styles.centered} />
          <Skeleton height={80} borderRadius={radius.lg} />
        </View>
      ) : null}

      {profileQ.isError ? (
        <ErrorState title="Profil indisponible" error={profileQ.error} onRetry={() => void profileQ.refetch()} />
      ) : null}

      {profile ? (
        <View style={styles.body}>
          <ProfileHero
            name={displayName}
            subtitle={heroSubtitle}
            profileImageUrl={profile.profile_image_url}
            coverImageUrl={profile.cover_image_url}
            showCover
          >
            {reviewStats?.total_reviews ? (
              <CompactAssigneeRating
                summary={{
                  averageRating: reviewStats.average_rating ?? 0,
                  reviewsCount: reviewStats.total_reviews,
                }}
              />
            ) : null}
          </ProfileHero>

          <PublicProfileContactActions phone={phone} />

          {profile.biography?.trim() ? (
            <PublicProfileSection title={providerType === 'nurse' ? 'Présentation' : 'Le laboratoire'}>
              <AppText variant="body">{profile.biography.trim()}</AppText>
            </PublicProfileSection>
          ) : null}

          {services.length ? (
            <PublicProfileSection title={providerType === 'nurse' ? 'Soins proposés' : 'Prélèvements disponibles'}>
              <Row wrap gap={spacing[2]}>
                {services.map((item) => (
                  <Row key={String(item.id)} gap={spacing[1.5]} style={styles.chip}>
                    <CareIcon care={item} />
                    <AppText variant="secondary" style={styles.chipLabel}>
                      {item.name}
                    </AppText>
                  </Row>
                ))}
              </Row>
            </PublicProfileSection>
          ) : null}

          {addressLabel || coverage ? (
            <SettingsSection
              title={providerType === 'nurse' ? "Zone d'intervention" : 'Adresse'}
              items={[
                itinerary
                  ? {
                      icon: MapPin,
                      label: addressLabel ?? 'Voir sur la carte',
                      description: coverage ? `${coverage} · Itinéraire` : 'Itinéraire',
                      onPress: () => void Linking.openURL(itinerary),
                    }
                  : {
                      icon: MapPin,
                      label: addressLabel ?? coverage ?? '',
                      description: addressLabel ? (coverage ?? undefined) : undefined,
                    },
              ]}
            />
          ) : null}

          <PublicProfileInfoCard title="Heures d'ouverture" rows={hoursRows} />
          <PublicProfileInfoCard title="Diplômes et formations" rows={qualificationRows} />
          <PublicProfileLinks website={profile.website_url} social={profile.social_links} />

          {reviewItems.length ? (
            <PublicProfileSection title="Avis récents">
              {reviewItems.map((item) => (
                <View key={item.id} style={styles.review}>
                  <Row gap={spacing[2]} wrap>
                    <ReviewStars rating={item.rating ?? 0} size={iconSize.sm} showValue={false} />
                    <AppText variant="caption">{item.patient_name?.trim() || 'Patient'}</AppText>
                  </Row>
                  {item.comment?.trim() ? <AppText variant="secondary">{item.comment.trim()}</AppText> : null}
                </View>
              ))}
            </PublicProfileSection>
          ) : null}
        </View>
      ) : null}
    </SheetModal>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    body: { gap: spacing[6], paddingBottom: spacing[4] },
    centered: { alignSelf: 'center' as const },
    chip: {
      maxWidth: '100%' as const,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
    },
    chipLabel: { flexShrink: 1, color: c.textPrimary },
    review: {
      gap: spacing[1],
      paddingVertical: spacing[2],
    },
  };
}
