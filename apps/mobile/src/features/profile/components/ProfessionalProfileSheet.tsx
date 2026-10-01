import { useAppColors } from '@/theme/use-app-colors';

import { useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  ExternalLink,
  Globe,
  MessageCircle,
  Phone,
  Share2,
  Stethoscope,
} from 'lucide-react-native';
import { SheetModal, PROFILE_SHEET_SNAP_POINTS } from '@/components/ui/SheetModal';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Button } from '@/components/ui/Button';
import {
  normalizeExternalUrl,
  professionalProfileDisplayName,
  type ProfessionalProfileData,
} from '@/features/profile/utils/professional-profile-sheet';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { hexToRgba, palette, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

const AVATAR = 96;
const COVER_FADE_COLORS = [palette.transparent, hexToRgba(palette.black, 0.35)] as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: ProfessionalProfileData;
  title?: string;
}

export function ProfessionalProfileSheet({
  visible, onClose, profile, title }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const displayName = professionalProfileDisplayName(profile);
  const sheetTitle = title?.trim() || displayName;
  const coverSrc = resolveProfileImageUrl(profile.coverImageUrl);
  const phone = profile.phone?.replace(/\s/g, '') ?? '';

  const socialRows = useMemo(() => {
    const links = profile.socialLinks;
    if (!links) return [];
    const rows: { key: string; label: string; url: string; Icon: typeof Globe }[] = [];
    if (links.facebook?.trim()) {
      rows.push({
        key: 'facebook',
        label: 'Facebook',
        url: normalizeExternalUrl(links.facebook),
        Icon: Share2,
      });
    }
    if (links.linkedin?.trim()) {
      rows.push({
        key: 'linkedin',
        label: 'LinkedIn',
        url: normalizeExternalUrl(links.linkedin),
        Icon: ExternalLink,
      });
    }
    if (links.instagram?.trim()) {
      rows.push({
        key: 'instagram',
        label: 'Instagram',
        url: normalizeExternalUrl(links.instagram),
        Icon: Camera,
      });
    }
    return rows;
  }, [profile.socialLinks]);

  const websiteUrl = profile.websiteUrl?.trim()
    ? normalizeExternalUrl(profile.websiteUrl)
    : '';

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={sheetTitle}
      subtitle={profile.emploi?.trim() || 'Professionnel de santé'}
      snapPoints={PROFILE_SHEET_SNAP_POINTS}
      contentStyle={styles.sheetBody}
    >
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
        <LinearGradient
          colors={COVER_FADE_COLORS}
          style={styles.coverFade}
        />
      </View>

      <View style={styles.identity}>
        <View style={styles.avatarRing}>
          <ProfileAvatar
            profileImageUrl={profile.profileImageUrl}
            seed={displayName}
            size={AVATAR}
            style={styles.avatar}
          />
        </View>
        <AppText style={styles.roleEyebrow}>Professionnel de santé</AppText>
        <AppText style={styles.name}>{displayName}</AppText>
        <Row wrap justify="center" gap={spacing[2]} style={styles.badges}>
          {profile.emploi ? (
            <Row wrap style={styles.badge}>
              <AppText style={styles.badgeMuted}>Profession</AppText>
              <AppText style={styles.badgeValue}> · {profile.emploi}</AppText>
            </Row>
          ) : null}
          <Row wrap style={styles.badge}>
            <AppText style={styles.badgeMuted}>N° Adeli</AppText>
            <AppText style={styles.badgeValue}> · {profile.adeli?.trim() || '—'}</AppText>
          </Row>
        </Row>
      </View>

      {phone ? (
        <Row justify="center" gap={spacing[2]} style={styles.contactRow}>
          <Button
            title="Appeler"
            variant="outline"
            size="sm"
            leftIcon={<Phone size={iconSize.sm} color={c.primary} strokeWidth={2} />}
            onPress={() => void Linking.openURL(`tel:${phone}`)}
            style={styles.contactBtn}
          />
          <Button
            title="Message"
            variant="outline"
            size="sm"
            leftIcon={<MessageCircle size={iconSize.sm} color={c.primary} strokeWidth={2} />}
            onPress={() => void Linking.openURL(`sms:${phone}`)}
            style={styles.contactBtn}
          />
        </Row>
      ) : null}

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Présentation</AppText>
        {profile.biography?.trim() ? (
          <AppText style={styles.bio}>{profile.biography.trim()}</AppText>
        ) : (
          <View style={styles.emptyBox}>
            <Stethoscope size={iconSize.md} color={c.textTertiary} strokeWidth={2} />
            <AppText style={styles.emptyText}>Aucune présentation renseignée sur le profil.</AppText>
          </View>
        )}
      </View>

      {websiteUrl || socialRows.length ? (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Site web et réseaux</AppText>
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
                    {profile.websiteUrl}
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
        </View>
      ) : null}
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  sheetBody: {
    paddingHorizontal: 0,
    paddingTop: 0,
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
    borderRadius: radius.full,
    padding: 3,
    backgroundColor: c.surface,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  roleEyebrow: {
    ...font.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: c.textTertiary,
    marginTop: spacing[1],
  },
  name: {
    ...font.heading,
    fontSize: fontSize.xl,
    color: c.textPrimary,
    textAlign: 'center' as const,
  },
  badges: {
    marginTop: spacing[1],
  },
  badge: {
    maxWidth: '100%' as const,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  badgeMuted: {
    ...font.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  badgeValue: {
    ...font.medium,
    fontSize: fontSize.xs,
    color: c.textPrimary,
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
    ...font.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: c.textTertiary,
  },
  bio: {
    ...font.regular,
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
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center' as const,
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
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  linkUrl: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
};
}

