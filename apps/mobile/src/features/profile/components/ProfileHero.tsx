import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, User } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { radius, spacing } from '@/theme';
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
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileHero_tsx_styles');
  const name = `${firstName} ${lastName}`.trim() || 'Mon profil';
  const coverSrc = resolveProfileImageUrl(coverImageUrl);

  return (
    <View style={styles.wrap}>
      {showCover ? (
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
        </View>
      ) : (
        <LinearGradient
          colors={[c.primaryLight, c.background]}
          style={styles.coverPlaceholder}
        />
      )}

      <View style={styles.identity}>
        <Pressable
          onPress={onEditPhotos}
          style={styles.avatarOuter}
          accessibilityLabel="Modifier les photos de profil"
        >
          <ProfileAvatar
            profileImageUrl={profileImageUrl}
            seed={name}
            gender={gender}
            size={AVATAR}
            style={styles.avatarClip}
          />
          <View style={styles.cameraBadge}>
            <Camera size={15} color={c.textInverse} strokeWidth={2.5} />
          </View>
        </Pressable>

        <Text style={styles.name}>{name}</Text>
        {role && ROLE_LABEL[role] ? (
          <Row gap={spacing[1]} align="center" style={styles.rolePill}>
            <User size={12} color={c.primary} strokeWidth={2} />
            <Text style={styles.roleText}>{ROLE_LABEL[role]}</Text>
          </Row>
        ) : null}
        {email ? <Text style={styles.email}>{email}</Text> : null}
      </View>
    </View>
  );
}

const AVATAR = 96;

function buildStyles(c: AppColors) {
  return {
  wrap: {
    marginBottom: spacing[2],
  },
  coverWrap: {
    height: 120,
    width: '100%' as const,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden' as const,
  },
  coverImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  coverPlaceholder: {
    height: 56,
    width: '100%' as const,
  },
  identity: {
    alignItems: 'center' as const,
    marginTop: -AVATAR / 2,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  avatarOuter: {
    width: AVATAR + 12,
    height: AVATAR + 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarClip: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
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

