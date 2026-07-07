import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useMemo } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
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
import { radius, spacing, iconSize, AppText } from '@/theme';
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
  const styles = useThemedStyles(buildStyles, 'ProviderPublicProfileSheet.ProfileSection');
  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProviderPublicProfileSheet_tsx_styles');
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
          <ActivityIndicator size="large" color={c.primary} />
          <AppText style={styles.stateText}>Chargement du profil…</AppText>
        </View>
      ) : null}

      {profileQ.isError ? (
        <View style={styles.centerState}>
          <AppText style={styles.errorTitle}>Profil indisponible</AppText>
          <AppText style={styles.stateText}>
            {profileQ.error instanceof Error
              ? profileQ.error.message
              : 'Impossible de charger ce profil.'}
          </AppText>
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
                colors={[c.gradientStart, c.gradientEnd]}
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
                  <FallbackIcon size={iconSize['3xl']} color={c.textTertiary} strokeWidth={1.75} />
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

            <AppText style={styles.roleEyebrow}>{roleLabel}</AppText>
            <AppText style={styles.name}>{displayName}</AppText>

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
                    <AppText style={styles.metaPillText}>{experience}</AppText>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {dialPhone ? (
            <Row justify="center" gap={spacing[2]} style={styles.contactRow}>
              <Button
                title="Appeler"
                variant="outline"
                size="sm"
                leftIcon={<Phone size={iconSize.sm} color={c.primary} strokeWidth={2} />}
                onPress={() => void Linking.openURL(`tel:${dialPhone}`)}
                style={styles.contactBtn}
              />
              <Button
                title="Message"
                variant="outline"
                size="sm"
                leftIcon={<MessageCircle size={iconSize.sm} color={c.primary} strokeWidth={2} />}
                onPress={() => void Linking.openURL(`sms:${dialPhone}`)}
                style={styles.contactBtn}
              />
            </Row>
          ) : null}

          <ProfileSection title={providerType === 'nurse' ? 'Présentation' : 'Le laboratoire'}>
            {profile.biography?.trim() ? (
              <AppText style={styles.bio}>{profile.biography.trim()}</AppText>
            ) : (
              <View style={styles.emptyBox}>
                <Stethoscope size={iconSize.md} color={c.textTertiary} strokeWidth={2} />
                <AppText style={styles.emptyText}>Aucune présentation renseignée.</AppText>
              </View>
            )}
          </ProfileSection>

          {services.length ? (
            <ProfileSection
              title={providerType === 'nurse' ? 'Expertises & soins' : 'Prélèvements disponibles'}
            >
              <Row wrap gap={spacing[2]} style={styles.chipWrap}>
                {services.map((item) => (
                  <Row key={String(item.id)} gap={spacing[1]} align="center" style={styles.chip}>
                    <AppText style={styles.chipEmoji}>{specializationEmoji(item)}</AppText>
                    <AppText style={styles.chipLabel} numberOfLines={2}>
                      {item.name}
                    </AppText>
                  </Row>
                ))}
              </Row>
            </ProfileSection>
          ) : null}

          {addressLabel || nurseMeta?.radius_km ? (
            <ProfileSection
              title={providerType === 'nurse' ? "Zone d'intervention" : 'Localisation'}
            >
              <View style={styles.infoCard}>
                {addressLabel ? (
                  <Cluster
                    gap={spacing[2]}
                    align="start"
                    leading={<MapPin size={iconSize.sm} color={c.primary} strokeWidth={2} />}
                  >
                    <AppText style={styles.infoText}>{addressLabel}</AppText>
                  </Cluster>
                ) : null}
                {nurseMeta?.radius_km ? (
                  <AppText style={styles.infoHint}>
                    Intervient dans un rayon de{' '}
                    <AppText style={styles.infoHintStrong}>{Math.round(nurseMeta.radius_km)} km</AppText>
                  </AppText>
                ) : null}
                {itinerary ? (
                  <Button
                    title="Itinéraire"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Navigation size={iconSize.xs} color={c.primary} strokeWidth={2} />}
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
                  <Row key={row.key} justify="between" align="center" gap={spacing[3]} style={styles.hoursRow}>
                    <Row gap={spacing[2]} align="center" flex={1} style={styles.hoursDay}>
                      <Clock size={iconSize.xs} color={c.textTertiary} strokeWidth={2} />
                      <AppText style={styles.hoursDayText}>{row.label}</AppText>
                    </Row>
                    <AppText style={styles.hoursValue}>{row.value}</AppText>
                  </Row>
                ))}
              </View>
            </ProfileSection>
          ) : null}

          {nurseMeta?.qualifications?.length ? (
            <ProfileSection title="Diplômes & formations">
              <View style={styles.qualList}>
                {nurseMeta.qualifications.map((q) => (
                  <Cluster
                    key={q.code}
                    gap={spacing[2]}
                    align="start"
                    leading={<GraduationCap size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
                    style={styles.qualRow}
                  >
                    <AppText style={styles.qualText}>{q.label}</AppText>
                  </Cluster>
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
                  <Cluster
                    gap={spacing[3]}
                    leading={
                      <View style={styles.linkIcon}>
                        <Globe size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
                      </View>
                    }
                    actions={<ExternalLink size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
                  >
                    <View style={styles.linkText}>
                      <AppText style={styles.linkLabel}>Site internet</AppText>
                      <AppText style={styles.linkUrl} numberOfLines={2}>
                        {profile.website_url}
                      </AppText>
                    </View>
                  </Cluster>
                </Pressable>
              ) : null}
              {socialRows.map((row) => (
                <Pressable
                  key={row.key}
                  style={styles.linkRow}
                  onPress={() => void Linking.openURL(row.url)}
                  accessibilityRole="link"
                >
                  <Cluster
                    gap={spacing[3]}
                    leading={
                      <View style={styles.linkIcon}>
                        <row.Icon size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
                      </View>
                    }
                    actions={<ExternalLink size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
                  >
                    <View style={styles.linkText}>
                      <AppText style={styles.linkLabel}>{row.label}</AppText>
                      <AppText style={styles.linkUrl} numberOfLines={1}>
                        {row.url.replace(/^https?:\/\//i, '')}
                      </AppText>
                    </View>
                  </Cluster>
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
                      <AppText style={styles.reviewComment} numberOfLines={4}>
                        « {item.comment.trim()} »
                      </AppText>
                    ) : null}
                    <Row justify="between" align="center" gap={spacing[2]} style={styles.reviewFooter}>
                      <AppText style={styles.reviewAuthor}>
                        {item.patient_name?.trim() || 'Patient'}
                      </AppText>
                      <ReviewStars rating={item.rating ?? 0} size={iconSize['2xs']} showValue={false} />
                    </Row>
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  stateText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
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
    width: '100%' as const,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden' as const,
    marginBottom: spacing[2],
  },
  coverImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  coverFade: {
    ...StyleSheet.absoluteFillObject,
  },
  identity: {
    alignItems: 'center' as const,
    paddingHorizontal: spacing[4],
    marginTop: -AVATAR / 2,
    gap: spacing[2],
  },
  avatarRing: {
    position: 'relative' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statusDot: {
    position: 'absolute' as const,
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
    textTransform: 'uppercase' as const,
    color: c.textTertiary,
    marginTop: spacing[1],
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: c.textPrimary,
    textAlign: 'center' as const,
  },
  identityMeta: {
    alignItems: 'center' as const,
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
    textTransform: 'uppercase' as const,
    color: c.textTertiary,
  },
  bio: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.55,
    color: c.textPrimary,
  },
  emptyBox: {
    alignItems: 'center' as const,
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center' as const,
  },
  chipWrap: {},
  chip: {
    maxWidth: '100%' as const,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  chipEmoji: {
    fontSize: fontSize.xs,
  },
  chipLabel: {
    minWidth: 0,
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
  infoRow: {},
  infoText: {
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
    alignSelf: 'flex-start' as const,
    marginTop: spacing[1],
  },
  hoursRow: {
    paddingVertical: spacing[1],
  },
  hoursDay: {},
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
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  qualText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  linkRow: {
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  linkText: {
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
    fontStyle: 'italic' as const,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  reviewFooter: {
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

