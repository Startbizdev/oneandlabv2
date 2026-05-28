import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, User } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { colors, radius, spacing } from '@/theme';
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
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
      ) : (
        <LinearGradient
          colors={['#E8FBF9', colors.background]}
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
            <Camera size={15} color={colors.textInverse} strokeWidth={2.5} />
          </View>
        </Pressable>

        <Text style={styles.name}>{name}</Text>
        {role && ROLE_LABEL[role] ? (
          <View style={styles.rolePill}>
            <User size={12} color={colors.primary} strokeWidth={2} />
            <Text style={styles.roleText}>{ROLE_LABEL[role]}</Text>
          </View>
        ) : null}
        {email ? <Text style={styles.email}>{email}</Text> : null}
      </View>
    </View>
  );
}

const AVATAR = 96;

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing[2],
  },
  coverWrap: {
    height: 120,
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    height: 56,
    width: '100%',
  },
  identity: {
    alignItems: 'center',
    marginTop: -AVATAR / 2,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  avatarOuter: {
    width: AVATAR + 12,
    height: AVATAR + 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarClip: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 3,
    borderColor: colors.surface,
    overflow: 'hidden',
    backgroundColor: colors.primaryLight,
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    zIndex: 2,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  name: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  roleText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  email: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
