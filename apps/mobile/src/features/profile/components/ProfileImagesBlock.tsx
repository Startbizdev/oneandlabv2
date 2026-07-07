import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { Camera, ImagePlus, Trash2, Upload, User } from 'lucide-react-native';
import { usePickProfileImage } from '@/features/profile/hooks/use-pick-profile-image';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileImagesBlock_tsx_styles');
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
      <AppText style={styles.cardTitle}>Photo de profil</AppText>

      <Cluster gap={spacing[4]} leading={
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
              <User size={iconSize['3xl']} color={c.textTertiary} strokeWidth={1.75} />
            </View>
          )}
          <View style={styles.avatarOverlay}>
            {picking === 'profile' ? (
              <ActivityIndicator color={c.textInverse} size="small" />
            ) : (
              <Camera size={iconSize.mdLg} color={c.textInverse} strokeWidth={2} />
            )}
          </View>
        </Pressable>
      }>
        <View style={styles.actionsCol}>
          <Pressable
            onPress={() => handlePick('profile')}
            disabled={busy}
            style={styles.actionBtn}
          >
            <Row gap={spacing[2]} align="center">
              <Upload size={iconSize.xs} color={c.primary} strokeWidth={2} />
              <AppText style={styles.actionLabel}>{profileSrc ? 'Changer' : 'Ajouter'}</AppText>
            </Row>
          </Pressable>
          {profileSrc ? (
            <Pressable
              onPress={() => onChangeProfile(null)}
              disabled={busy}
              style={[styles.actionBtn, styles.actionBtnDanger]}
            >
              <Row gap={spacing[2]} align="center">
                <Trash2 size={iconSize.xs} color={c.error} strokeWidth={2} />
                <AppText style={[styles.actionLabel, styles.actionLabelDanger]}>Supprimer</AppText>
              </Row>
            </Pressable>
          ) : null}
        </View>
      </Cluster>

      {showCover && onChangeCover ? (
        <View style={styles.coverSection}>
          <AppText style={styles.coverLabel}>Image de couverture</AppText>
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
                <ImagePlus size={iconSize.xl} color={c.textTertiary} strokeWidth={1.75} />
              </View>
            )}
            {picking === 'cover' ? (
              <View style={styles.coverOverlay}>
                <ActivityIndicator color={c.textInverse} />
              </View>
            ) : null}
          </Pressable>
          <Row wrap gap={spacing[2]} style={styles.coverActions}>
            <Pressable onPress={() => pickImage('cover')} disabled={busy} style={styles.actionBtn}>
              <Row gap={spacing[2]} align="center">
                <Upload size={iconSize.xs} color={c.primary} strokeWidth={2} />
                <AppText style={styles.actionLabel}>{coverSrc ? 'Changer' : 'Ajouter'}</AppText>
              </Row>
            </Pressable>
            {coverSrc ? (
              <Pressable
                onPress={() => onChangeCover(null)}
                disabled={busy}
                style={[styles.actionBtn, styles.actionBtnDanger]}
              >
                <Row gap={spacing[2]} align="center">
                  <Trash2 size={iconSize.xs} color={c.error} strokeWidth={2} />
                  <AppText style={[styles.actionLabel, styles.actionLabelDanger]}>Supprimer</AppText>
                </Row>
              </Pressable>
            ) : null}
          </Row>
        </View>
      ) : null}
    </View>
  );
}

const AVATAR = 112;

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[4],
  },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  avatarBtn: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden' as const,
    borderWidth: 2,
    borderColor: c.borderLight,
  },
  avatarImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  avatarPlaceholder: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: c.surfaceAlt,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionsCol: {
    gap: spacing[2],
  },
  actionBtn: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  actionBtnDanger: {
    backgroundColor: c.errorLight,
    borderColor: c.errorMid,
  },
  actionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
  actionLabelDanger: {
    color: c.error,
  },
  coverSection: {
    gap: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  coverLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  coverBtn: {
    width: '100%' as const,
    aspectRatio: 2,
    maxHeight: 120,
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  coverImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  coverPlaceholder: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  coverActions: {},
};
}

