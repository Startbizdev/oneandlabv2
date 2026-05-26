import { useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { SheetModal } from '@/components/ui/SheetModal';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Button } from '@/components/ui/Button';
import {
  normalizeExternalUrl,
  professionalProfileDisplayName,
  type ProfessionalProfileData,
} from '@/features/profile/utils/professional-profile-sheet';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const AVATAR = 96;

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: ProfessionalProfileData;
  title?: string;
}

export function ProfessionalProfileSheet({ visible, onClose, profile, title }: Props) {
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
      contentStyle={styles.sheetBody}
    >
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
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)']}
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
        <Text style={styles.roleEyebrow}>Professionnel de santé</Text>
        <Text style={styles.name}>{displayName}</Text>
        <View style={styles.badges}>
          {profile.emploi ? (
            <View style={styles.badge}>
              <Text style={styles.badgeMuted}>Profession</Text>
              <Text style={styles.badgeValue}> · {profile.emploi}</Text>
            </View>
          ) : null}
          <View style={styles.badge}>
            <Text style={styles.badgeMuted}>N° Adeli</Text>
            <Text style={styles.badgeValue}> · {profile.adeli?.trim() || '—'}</Text>
          </View>
        </View>
      </View>

      {phone ? (
        <View style={styles.contactRow}>
          <Button
            title="Appeler"
            variant="outline"
            size="sm"
            leftIcon={<Phone size={16} color={colors.primary} strokeWidth={2} />}
            onPress={() => void Linking.openURL(`tel:${phone}`)}
            style={styles.contactBtn}
          />
          <Button
            title="Message"
            variant="outline"
            size="sm"
            leftIcon={<MessageCircle size={16} color={colors.primary} strokeWidth={2} />}
            onPress={() => void Linking.openURL(`sms:${phone}`)}
            style={styles.contactBtn}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Présentation</Text>
        {profile.biography?.trim() ? (
          <Text style={styles.bio}>{profile.biography.trim()}</Text>
        ) : (
          <View style={styles.emptyBox}>
            <Stethoscope size={20} color={colors.textTertiary} strokeWidth={2} />
            <Text style={styles.emptyText}>Aucune présentation renseignée sur le profil.</Text>
          </View>
        )}
      </View>

      {websiteUrl || socialRows.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Site web et réseaux</Text>
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
                  {profile.websiteUrl}
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
        </View>
      ) : null}
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  coverWrap: {
    height: 140,
    width: '100%',
    backgroundColor: colors.surfaceAlt,
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
    borderRadius: radius.full,
    padding: 3,
    backgroundColor: colors.surface,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  avatar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  roleEyebrow: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginTop: spacing[1],
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  badge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: '100%',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  badgeMuted: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  badgeValue: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
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
    borderColor: colors.borderLight,
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
    color: colors.textTertiary,
  },
  bio: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.55,
    color: colors.textPrimary,
  },
  emptyBox: {
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
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
    color: colors.textPrimary,
  },
  linkUrl: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
