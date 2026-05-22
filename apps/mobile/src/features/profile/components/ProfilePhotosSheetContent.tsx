import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Camera, ImagePlus, Trash2, User } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { usePickProfileImage } from '@/features/profile/hooks/use-pick-profile-image';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  profileImageUrl: string | null;
  coverImageUrl?: string | null;
  showCover?: boolean;
  saving?: boolean;
  onChangeProfile: (url: string | null) => void;
  onChangeCover?: (url: string | null) => void;
}

const COVER_H = 120;
const AVATAR = 80;

export function ProfilePhotosSheetContent({
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
  const busy = saving || isPicking;
  const hasCoverEditor = showCover && !!onChangeCover;

  async function handlePick(target: 'profile' | 'cover') {
    if (busy) return;
    const url = await pickImage(target);
    if (!url) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (target === 'profile') onChangeProfile(url);
    else onChangeCover?.(url);
  }

  function handleRemove(target: 'profile' | 'cover') {
    if (busy) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (target === 'profile') onChangeProfile(null);
    else onChangeCover?.(null);
  }

  return (
    <View style={styles.root}>
      <View style={styles.preview}>
        <Pressable
          onPress={hasCoverEditor ? () => handlePick('cover') : undefined}
          disabled={!hasCoverEditor || busy}
          accessibilityLabel="Modifier l'image de couverture"
          style={styles.coverPressable}
        >
          <View style={styles.coverFrame}>
            {coverSrc ? (
              <Image source={{ uri: coverSrc }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coverFill}
              />
            )}
            {picking === 'cover' ? (
              <View style={styles.coverLoading}>
                <ActivityIndicator color={colors.textInverse} />
              </View>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.avatarRow}>
          <Pressable
            onPress={() => handlePick('profile')}
            disabled={busy}
            accessibilityLabel="Modifier la photo de profil"
            style={styles.avatarPressable}
          >
            <View style={styles.avatarRing}>
              {profileSrc ? (
                <Image source={{ uri: profileSrc }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={28} color={colors.primary} strokeWidth={1.75} />
                </View>
              )}
            </View>
            <View style={styles.cameraBadge}>
              {picking === 'profile' ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Camera size={13} color={colors.textInverse} strokeWidth={2.5} />
              )}
            </View>
          </Pressable>
        </View>
      </View>

      <PhotoActions
        title="Photo de profil"
        hasImage={!!profileSrc}
        loading={picking === 'profile'}
        disabled={busy}
        onPick={() => handlePick('profile')}
        onRemove={() => handleRemove('profile')}
      />

      {hasCoverEditor ? (
        <PhotoActions
          title="Image de couverture"
          hasImage={!!coverSrc}
          loading={picking === 'cover'}
          disabled={busy}
          onPick={() => handlePick('cover')}
          onRemove={() => handleRemove('cover')}
        />
      ) : null}
    </View>
  );
}

interface PhotoActionsProps {
  title: string;
  hasImage: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPick: () => void;
  onRemove: () => void;
}

function PhotoActions({
  title,
  hasImage,
  loading,
  disabled,
  onPick,
  onRemove,
}: PhotoActionsProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionButtons}>
        <Button
          title={hasImage ? 'Changer' : 'Importer depuis la galerie'}
          fullWidth
          size="md"
          loading={loading}
          disabled={disabled}
          onPress={onPick}
          leftIcon={<ImagePlus size={18} color={colors.textInverse} strokeWidth={2.25} />}
        />
        {hasImage ? (
          <Button
            title="Retirer"
            variant="outline"
            fullWidth
            size="md"
            disabled={disabled || loading}
            onPress={onRemove}
            leftIcon={<Trash2 size={16} color={colors.error} strokeWidth={2} />}
            style={styles.removeOutline}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  preview: {
    width: '100%',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing[5],
    overflow: 'hidden',
  },
  coverPressable: {
    width: '100%',
    height: COVER_H,
  },
  coverFrame: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  coverFill: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  avatarRow: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing[4],
    backgroundColor: colors.surface,
  },
  avatarPressable: {
    width: AVATAR + 12,
    height: AVATAR + 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 4,
    borderColor: colors.surface,
    overflow: 'hidden',
    backgroundColor: colors.primaryLight,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  section: {
    width: '100%',
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  sectionButtons: {
    width: '100%',
    rowGap: spacing[2],
  },
  removeOutline: {
    borderColor: colors.errorMid,
    backgroundColor: colors.errorLight,
  },
});
