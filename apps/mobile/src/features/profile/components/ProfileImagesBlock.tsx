import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, ImagePlus, Trash2, Upload, User } from 'lucide-react-native';
import { usePickProfileImage } from '@/features/profile/hooks/use-pick-profile-image';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  profileImageUrl: string | null;
  coverImageUrl?: string | null;
  showCover?: boolean;
  saving?: boolean;
  onChangeProfile: (url: string | null) => void;
  onChangeCover?: (url: string | null) => void;
}

export function ProfileImagesBlock({
  profileImageUrl,
  coverImageUrl = null,
  showCover = true,
  saving = false,
  onChangeProfile,
  onChangeCover,
}: Props) {
  const { picking, pickImage, isPicking } = usePickProfileImage();

  const profileSrc = resolveProfileImageUrl(profileImageUrl);
  const coverSrc = resolveProfileImageUrl(coverImageUrl);

  async function handlePick(target: 'profile' | 'cover') {
    const url = await pickImage(target);
    if (!url) return;
    if (target === 'profile') onChangeProfile(url);
    else onChangeCover?.(url);
  }

  const busy = saving || isPicking;

  return (
    <View style={[styles.card, elevation.xs]}>
      <Text style={styles.cardTitle}>Photo de profil</Text>

      <View style={styles.profileRow}>
        <Pressable
          onPress={() => handlePick('profile')}
          disabled={busy}
          style={styles.avatarBtn}
          accessibilityLabel="Changer la photo de profil"
        >
          {profileSrc ? (
            <Image source={{ uri: profileSrc }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={36} color={colors.textTertiary} strokeWidth={1.75} />
            </View>
          )}
          <View style={styles.avatarOverlay}>
            {picking === 'profile' ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Camera size={22} color={colors.textInverse} strokeWidth={2} />
            )}
          </View>
        </Pressable>

        <View style={styles.actionsCol}>
          <Pressable
            onPress={() => handlePick('profile')}
            disabled={busy}
            style={styles.actionBtn}
          >
            <Upload size={14} color={colors.primary} strokeWidth={2} />
            <Text style={styles.actionLabel}>{profileSrc ? 'Changer' : 'Ajouter'}</Text>
          </Pressable>
          {profileSrc ? (
            <Pressable
              onPress={() => onChangeProfile(null)}
              disabled={busy}
              style={[styles.actionBtn, styles.actionBtnDanger]}
            >
              <Trash2 size={14} color={colors.error} strokeWidth={2} />
              <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Supprimer</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {showCover && onChangeCover ? (
        <View style={styles.coverSection}>
          <Text style={styles.coverLabel}>Image de couverture</Text>
          <Pressable
            onPress={() => handlePick('cover')}
            disabled={busy}
            style={styles.coverBtn}
            accessibilityLabel="Changer l'image de couverture"
          >
            {coverSrc ? (
              <Image source={{ uri: coverSrc }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <ImagePlus size={28} color={colors.textTertiary} strokeWidth={1.75} />
              </View>
            )}
            {picking === 'cover' ? (
              <View style={styles.coverOverlay}>
                <ActivityIndicator color={colors.textInverse} />
              </View>
            ) : null}
          </Pressable>
          <View style={styles.coverActions}>
            <Pressable onPress={() => pickImage('cover')} disabled={busy} style={styles.actionBtn}>
              <Upload size={14} color={colors.primary} strokeWidth={2} />
              <Text style={styles.actionLabel}>{coverSrc ? 'Changer' : 'Ajouter'}</Text>
            </Pressable>
            {coverSrc ? (
              <Pressable
                onPress={() => onChangeCover(null)}
                disabled={busy}
                style={[styles.actionBtn, styles.actionBtnDanger]}
              >
                <Trash2 size={14} color={colors.error} strokeWidth={2} />
                <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Supprimer</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const AVATAR = 112;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[4],
  },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  avatarBtn: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsCol: {
    flex: 1,
    gap: spacing[2],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  actionBtnDanger: {
    backgroundColor: colors.errorLight,
    borderColor: colors.errorMid,
  },
  actionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  actionLabelDanger: {
    color: colors.error,
  },
  coverSection: {
    gap: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  coverLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  coverBtn: {
    width: '100%',
    aspectRatio: 2,
    maxHeight: 120,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
