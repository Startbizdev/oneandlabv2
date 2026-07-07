import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, User } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { radius, spacing, iconSize, avatarSize, useLayoutMetrics, responsiveValue, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const ROLE_LABEL: Record<string, string> = {
  nurse: 'Infirmier·ère',
  pro: 'Pro de santé',
  preleveur: 'Préleveur',
  patient: 'Patient',
};

interface Props {
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  gender?: string | null;
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  showCover?: boolean;
  onEditPhotos?: () => void;
}

export function ProfileHero({
  firstName,
  lastName,
  email,
  role,
  gender,
  profileImageUrl,
  coverImageUrl,
  showCover = false,
  onEditPhotos,
}: Props) {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileHero_tsx_styles');
  const name = `${firstName} ${lastName}`.trim() || 'Mon profil';
  const coverSrc = resolveProfileImageUrl(coverImageUrl);
  const coverHeight = responsiveValue(layout, { compact: 96, default: 120, wide: 132 });
  const avatarSizePx = responsiveValue(layout, {
    compact: avatarSize.md,
    default: avatarSize.lg + 32,
    wide: avatarSize.lg + 40,
  });

  return (
    <View style={styles.wrap}>
      {showCover ? (
        <View style={[styles.coverWrap, { height: coverHeight }]}>
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
        </View>
      ) : (
        <LinearGradient
          colors={[c.primaryLight, c.background]}
          style={[styles.coverPlaceholder, { height: coverHeight * 0.47 }]}
        />
      )}

      <View style={[styles.identity, { marginTop: -avatarSizePx / 2 }]}>
        <Pressable
          onPress={onEditPhotos}
          style={styles.avatarOuter}
          accessibilityLabel="Modifier les photos de profil"
        >
          <ProfileAvatar
            profileImageUrl={profileImageUrl}
            seed={name}
            gender={gender}
            size={avatarSizePx}
            style={[styles.avatarClip, { width: avatarSizePx, height: avatarSizePx, borderRadius: avatarSizePx / 2 }]}
          />
          <View style={styles.cameraBadge}>
            <Camera size={iconSize.xs} color={c.textInverse} strokeWidth={2.5} />
          </View>
        </Pressable>

        <AppText style={styles.name}>{name}</AppText>
        {role && ROLE_LABEL[role] ? (
          <Row gap={spacing[1]} align="center" style={styles.rolePill}>
            <User size={iconSize['2xs']} color={c.primary} strokeWidth={2} />
            <AppText style={styles.roleText}>{ROLE_LABEL[role]}</AppText>
          </Row>
        ) : null}
        {email ? <AppText style={styles.email}>{email}</AppText> : null}
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    marginBottom: spacing[2],
  },
  coverWrap: {
    width: '100%' as const,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden' as const,
  },
  coverImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  coverPlaceholder: {
    width: '100%' as const,
  },
  identity: {
    alignItems: 'center' as const,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  avatarOuter: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarClip: {
    borderWidth: 3,
    borderColor: c.surface,
    overflow: 'hidden' as const,
    backgroundColor: c.primaryLight,
  },
  cameraBadge: {
    position: 'absolute' as const,
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 3,
    borderColor: c.surface,
    zIndex: 2,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  name: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: c.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center' as const,
  },
  rolePill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  roleText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  email: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
  },
};
}

