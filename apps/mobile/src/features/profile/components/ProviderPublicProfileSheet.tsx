import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Building2,
  Camera,
  Clock,
  ExternalLink,
  Globe,
  GraduationCap,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  Stethoscope,
  User,
} from 'lucide-react-native';
import { careCategoryEmojiForCategory } from '@oneandlab/shared-utils';
import { SheetModal, PROFILE_SHEET_SNAP_POINTS } from '@/components/ui/SheetModal';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Button } from '@/components/ui/Button';
import { fetchPublicProviderProfile } from '@/features/profile/api/public-profile.service';
import type {
  PublicLabProfile,
  PublicNurseProfile,
  PublicProfileSpecialization,
} from '@/features/profile/types/public-profile.types';
import { openingHoursRows } from '@/features/profile/utils/opening-hours-display';
import { parseProfileSocialLinks } from '@/features/profile/utils/profile-social-links';
import { normalizeExternalUrl } from '@/features/profile/utils/professional-profile-sheet';
import { yearsExperienceLabel } from '@/features/profile/utils/years-experience-label';
import { CompactAssigneeRating } from '@/features/appointments/detail/components/CompactAssigneeRating';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import { queryKeys } from '@/lib/query-keys';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const AVATAR = 96;

interface Props {
  visible: boolean;
  onClose: () => void;
  providerType: 'nurse' | 'lab';
  slug: string;
  title?: string;
  /** Téléphone depuis le RDV (non exposé par l’API publique). */
  phone?: string | null;
}

function isNurseProfile(
  profile: PublicNurseProfile | PublicLabProfile,
  providerType: 'nurse' | 'lab',
): profile is PublicNurseProfile {
  return providerType === 'nurse';
}

function specializationEmoji(item: PublicProfileSpecialization): string {
  return (
    careCategoryEmojiForCategory({
      name: item.name,
      icon: item.icon ?? undefined,
      type: item.type,
    }) || '•'
  );
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

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function ProviderPublicProfileSheet({
  visible,
  onClose,
  providerType,
  slug,
  title,
  phone,
}: Props) {
  const trimmedSlug = slug.trim();
  const profileQ = useQuery({
    queryKey: queryKeys.profile.publicProvider(providerType, trimmedSlug),
    queryFn: () => fetchPublicProviderProfile(providerType, trimmedSlug),
    enabled: visible && Boolean(trimmedSlug),
    staleTime: 60_000,
  });

  const profile = profileQ.data;
  const displayName = profile?.name?.trim() || title?.trim() || 'Profil';
  const sheetTitle = title?.trim() || displayName;
  const roleLabel = providerType === 'nurse' ? 'Infirmier à domicile' : 'Laboratoire de biologie';
  const coverSrc = resolveProfileImageUrl(profile?.cover_image_url);
  const dialPhone = (phone ?? '').replace(/\s/g, '');
  const reviewStats = profile?.reviews?.stats;
  const reviewItems = profile?.reviews?.items?.slice(0, 3) ?? [];

  const socialRows = useMemo(() => {
    const links = parseProfileSocialLinks(profile?.social_links ?? undefined);
    const rows: { key: string; label: string; url: string; Icon: typeof Globe }[] = [];
    if (links.facebook) {
      rows.push({ key: 'facebook', label: 'Facebook', url: normalizeExternalUrl(links.facebook), Icon: Share2 });
    }
    if (links.linkedin) {
      rows.push({ key: 'linkedin', label: 'LinkedIn', url: normalizeExternalUrl(links.linkedin), Icon: ExternalLink });
    }
    if (links.instagram) {
      rows.push({ key: 'instagram', label: 'Instagram', url: normalizeExternalUrl(links.instagram), Icon: Camera });
    }
    return rows;
  }, [profile?.social_links]);

  const websiteUrl = profile?.website_url?.trim()
    ? normalizeExternalUrl(profile.website_url)
    : '';

  const services = useMemo(() => {
    if (!profile) return [];
    if (isNurseProfile(profile, providerType)) {
      return profile.specializations ?? [];
    }
    return (profile as PublicLabProfile).services ?? [];
  }, [profile, providerType]);

  const hoursRows = useMemo(() => {
    if (!profile || providerType !== 'lab') return [];
    return openingHoursRows((profile as PublicLabProfile).opening_hours);
  }, [profile, providerType]);

  const nurseMeta =
    providerType === 'nurse' && profile ? (profile as PublicNurseProfile) : null;
  const experience = yearsExperienceLabel(nurseMeta?.years_experience);
  const addressLabel =
    profile?.address?.trim() || profile?.city_plain?.trim() || null;
  const itinerary = mapsUrl(addressLabel, profile?.map_center);

  const FallbackIcon = providerType === 'nurse' ? User : Building2;

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={sheetTitle}
      subtitle={profile ? roleLabel : undefined}
      presentKey={`${providerType}:${trimmedSlug}`}
      snapPoints={PROFILE_SHEET_SNAP_POINTS}
      contentStyle={styles.sheetBody}
    >
      {profileQ.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Chargement du profil…</Text>
        </View>
      ) : null}

      {profileQ.isError ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Profil indisponible</Text>
          <Text style={styles.stateText}>
            {profileQ.error instanceof Error
              ? profileQ.error.message
              : 'Impossible de charger ce profil.'}
          </Text>
          <Button
            title="Réessayer"
            variant="outline"
            size="sm"
            onPress={() => void profileQ.refetch()}
            style={styles.retryBtn}
          />
        </View>
      ) : null}

      {profile ? (
        <>
          <View style={styles.coverWrap}>
            {coverSrc ? (
              <Image source={{ uri: coverSrc }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)']} style={styles.coverFade} />
          </View>

          <View style={styles.identity}>
            <View style={styles.avatarRing}>
              {profile.profile_image_url ? (
                <ProfileAvatar
                  profileImageUrl={profile.profile_image_url}
                  seed={displayName}
                  size={AVATAR}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <FallbackIcon size={36} color={colors.textTertiary} strokeWidth={1.75} />
                </View>
              )}
              {providerType === 'nurse' && nurseMeta ? (
                <View
                  style={[
                    styles.statusDot,
                    nurseMeta.is_accepting_appointments === false
                      ? styles.statusDotBusy
                      : styles.statusDotOpen,
                  ]}
                />
              ) : null}
            </View>

            <Text style={styles.roleEyebrow}>{roleLabel}</Text>
            <Text style={styles.name}>{displayName}</Text>

            {reviewStats?.total_reviews || experience ? (
              <View style={styles.identityMeta}>
                {reviewStats?.total_reviews ? (
                  <CompactAssigneeRating
                    summary={{
                      averageRating: reviewStats.average_rating ?? 0,
                      reviewsCount: reviewStats.total_reviews,
                    }}
                  />
                ) : null}
                {experience ? (
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>{experience}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {dialPhone ? (
            <View style={styles.contactRow}>
              <Button
                title="Appeler"
                variant="outline"
                size="sm"
                leftIcon={<Phone size={16} color={colors.primary} strokeWidth={2} />}
                onPress={() => void Linking.openURL(`tel:${dialPhone}`)}
                style={styles.contactBtn}
              />
              <Button
                title="Message"
                variant="outline"
                size="sm"
                leftIcon={<MessageCircle size={16} color={colors.primary} strokeWidth={2} />}
                onPress={() => void Linking.openURL(`sms:${dialPhone}`)}
                style={styles.contactBtn}
              />
            </View>
          ) : null}

          <ProfileSection title={providerType === 'nurse' ? 'Présentation' : 'Le laboratoire'}>
            {profile.biography?.trim() ? (
              <Text style={styles.bio}>{profile.biography.trim()}</Text>
            ) : (
              <View style={styles.emptyBox}>
                <Stethoscope size={20} color={colors.textTertiary} strokeWidth={2} />
                <Text style={styles.emptyText}>Aucune présentation renseignée.</Text>
              </View>
            )}
          </ProfileSection>

          {services.length ? (
            <ProfileSection
              title={providerType === 'nurse' ? 'Expertises & soins' : 'Prélèvements disponibles'}
            >
              <View style={styles.chipWrap}>
                {services.map((item) => (
                  <View key={String(item.id)} style={styles.chip}>
                    <Text style={styles.chipEmoji}>{specializationEmoji(item)}</Text>
                    <Text style={styles.chipLabel} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>
                ))}
              </View>
            </ProfileSection>
          ) : null}

          {addressLabel || nurseMeta?.radius_km ? (
            <ProfileSection
              title={providerType === 'nurse' ? "Zone d'intervention" : 'Localisation'}
            >
              <View style={styles.infoCard}>
                {addressLabel ? (
                  <View style={styles.infoRow}>
                    <MapPin size={16} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.infoText}>{addressLabel}</Text>
                  </View>
                ) : null}
                {nurseMeta?.radius_km ? (
                  <Text style={styles.infoHint}>
                    Intervient dans un rayon de{' '}
                    <Text style={styles.infoHintStrong}>{Math.round(nurseMeta.radius_km)} km</Text>
                  </Text>
                ) : null}
                {itinerary ? (
                  <Button
                    title="Itinéraire"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Navigation size={14} color={colors.primary} strokeWidth={2} />}
                    onPress={() => void Linking.openURL(itinerary)}
                    style={styles.itineraryBtn}
                  />
                ) : null}
              </View>
            </ProfileSection>
          ) : null}

          {hoursRows.length ? (
            <ProfileSection title="Heures d'ouverture">
              <View style={styles.infoCard}>
                {hoursRows.map((row) => (
                  <View key={row.key} style={styles.hoursRow}>
                    <View style={styles.hoursDay}>
                      <Clock size={14} color={colors.textTertiary} strokeWidth={2} />
                      <Text style={styles.hoursDayText}>{row.label}</Text>
                    </View>
                    <Text style={styles.hoursValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </ProfileSection>
          ) : null}

          {nurseMeta?.qualifications?.length ? (
            <ProfileSection title="Diplômes & formations">
              <View style={styles.qualList}>
                {nurseMeta.qualifications.map((q) => (
                  <View key={q.code} style={styles.qualRow}>
                    <GraduationCap size={16} color={colors.textTertiary} strokeWidth={2} />
                    <Text style={styles.qualText}>{q.label}</Text>
                  </View>
                ))}
              </View>
            </ProfileSection>
          ) : null}

          {websiteUrl || socialRows.length ? (
            <ProfileSection title="Site web et réseaux">
              {websiteUrl ? (
                <Pressable
                  style={styles.linkRow}
                  onPress={() => void Linking.openURL(websiteUrl)}
                  accessibilityRole="link"
                >
                  <View style={styles.linkIcon}>
                    <Globe size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.linkText}>
                    <Text style={styles.linkLabel}>Site internet</Text>
                    <Text style={styles.linkUrl} numberOfLines={2}>
                      {profile.website_url}
                    </Text>
                  </View>
                  <ExternalLink size={16} color={colors.textTertiary} strokeWidth={2} />
                </Pressable>
              ) : null}
              {socialRows.map((row) => (
                <Pressable
                  key={row.key}
                  style={styles.linkRow}
                  onPress={() => void Linking.openURL(row.url)}
                  accessibilityRole="link"
                >
                  <View style={styles.linkIcon}>
                    <row.Icon size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.linkText}>
                    <Text style={styles.linkLabel}>{row.label}</Text>
                    <Text style={styles.linkUrl} numberOfLines={1}>
                      {row.url.replace(/^https?:\/\//i, '')}
                    </Text>
                  </View>
                  <ExternalLink size={16} color={colors.textTertiary} strokeWidth={2} />
                </Pressable>
              ))}
            </ProfileSection>
          ) : null}

          {reviewItems.length ? (
            <ProfileSection title="Avis récents">
              <View style={styles.reviewList}>
                {reviewItems.map((item) => (
                  <View key={item.id} style={styles.reviewCard}>
                    {item.comment?.trim() ? (
                      <Text style={styles.reviewComment} numberOfLines={4}>
                        « {item.comment.trim()} »
                      </Text>
                    ) : null}
                    <View style={styles.reviewFooter}>
                      <Text style={styles.reviewAuthor}>
                        {item.patient_name?.trim() || 'Patient'}
                      </Text>
                      <ReviewStars rating={item.rating ?? 0} size={12} showValue={false} />
                    </View>
                  </View>
                ))}
              </View>
            </ProfileSection>
          ) : null}
        </>
      ) : null}
    </SheetModal>
  );
}

function buildStyles(c: AppColors) {
  return {
  sheetBody: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  stateText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.45,
  },
  errorTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: c.textPrimary,
  },
  retryBtn: {
    marginTop: spacing[2],
  },
  coverWrap: {
    height: 140,
    width: '100%',
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFade: {
    ...StyleSheet.absoluteFillObject,
  },
  identity: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginTop: -AVATAR / 2,
    gap: spacing[2],
  },
  avatarRing: {
    position: 'relative',
    borderRadius: radius.full,
    padding: 3,
    backgroundColor: c.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  avatarFallback: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: c.surface,
  },
  statusDotOpen: {
    backgroundColor: c.success,
  },
  statusDotBusy: {
    backgroundColor: c.warning,
  },
  roleEyebrow: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: c.textTertiary,
    marginTop: spacing[1],
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: c.textPrimary,
    textAlign: 'center',
  },
  identityMeta: {
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[0.5],
  },
  metaPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
  },
  metaPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primaryDark,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    marginTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  contactBtn: {
    minWidth: 120,
  },
  section: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    gap: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: c.textTertiary,
  },
  bio: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.55,
    color: c.textPrimary,
  },
  emptyBox: {
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    maxWidth: '100%',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipLabel: {
    flexShrink: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textPrimary,
  },
  infoCard: {
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.45,
  },
  infoHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  infoHintStrong: {
    fontFamily: fontFamily.semiBold,
    color: c.textPrimary,
  },
  itineraryBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing[1],
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  hoursDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  hoursDayText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  hoursValue: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  qualList: {
    gap: spacing[2],
  },
  qualRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  qualText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
  linkLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  linkUrl: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  reviewList: {
    gap: spacing[2],
  },
  reviewCard: {
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
    gap: spacing[2],
  },
  reviewComment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  reviewAuthor: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_profile_components_ProviderPublicProfileSheet_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
