import type { ReactNode } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Camera } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import {
  ICON_STROKE_WIDTH,
  avatarSize,
  iconSize,
  radius,
  responsiveValue,
  spacing,
  useLayoutMetrics,
  AppText,
  useAppColors,
  useStyles,
  font,
  type Theme,
} from '@/theme';

interface Props {
  name: string;
  /** Graine stable de l'avatar généré (id utilisateur), sinon le nom. */
  seed?: string | null;
  subtitle?: string | null;
  gender?: string | null;
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  /** Bandeau de couverture (fiche publique infirmier / pro). */
  showCover?: boolean;
  onEditPhotos?: () => void;
  /** Ligne d'informations sous le nom (note, expérience…). */
  children?: ReactNode;
}

/** Identité en tête d'un profil (le sien ou une fiche publique) : couverture, photo, nom. */
export function ProfileHero({
  name: rawName,
  seed,
  subtitle,
  gender,
  profileImageUrl,
  coverImageUrl,
  showCover = false,
  onEditPhotos,
  children,
}: Props) {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const name = rawName.trim() || 'Mon profil';
  const coverSrc = resolveProfileImageUrl(coverImageUrl);
  const coverHeight = responsiveValue(layout, { compact: 96, default: 120, wide: 132 });
  const avatarPx = responsiveValue(layout, {
    compact: avatarSize.lg,
    default: avatarSize.lg + 24,
    wide: avatarSize.lg + 32,
  });

  return (
    <View style={styles.wrap}>
      {showCover ? (
        <View style={[styles.cover, { height: coverHeight }]}>
          {coverSrc ? <Image source={{ uri: coverSrc }} style={styles.coverImage} resizeMode="cover" /> : null}
        </View>
      ) : null}

      <View style={[styles.identity, showCover && { marginTop: -avatarPx / 2 }]}>
        <Pressable
          onPress={onEditPhotos}
          disabled={!onEditPhotos}
          accessibilityRole="button"
          accessibilityLabel="Modifier la photo de profil"
          hitSlop={spacing[1]}
        >
          <ProfileAvatar
            profileImageUrl={profileImageUrl}
            seed={seed || name}
            gender={gender}
            size={avatarPx}
            style={[styles.avatar, { borderRadius: avatarPx / 2 }]}
          />
          {onEditPhotos ? (
            <View style={styles.cameraBadge}>
              <Camera size={iconSize.sm} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          ) : null}
        </Pressable>

        <AppText style={styles.name}>{name}</AppText>
        {subtitle ? (
          <AppText variant="secondary" style={styles.centered}>
            {subtitle}
          </AppText>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const BADGE = 32;

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: {
      gap: spacing[2],
    },
    cover: {
      width: '100%' as const,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden' as const,
    },
    coverImage: {
      width: '100%' as const,
      height: '100%' as const,
    },
    identity: {
      alignItems: 'center' as const,
      gap: spacing[1],
    },
    avatar: {
      borderWidth: 3,
      borderColor: c.surface,
      overflow: 'hidden' as const,
      backgroundColor: c.surfaceAlt,
    },
    cameraBadge: {
      position: 'absolute' as const,
      right: 0,
      bottom: 0,
      width: BADGE,
      height: BADGE,
      borderRadius: BADGE / 2,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    name: {
      ...font.heading,
      fontSize: fontSize['2xl'],
      color: c.textPrimary,
      textAlign: 'center' as const,
      marginTop: spacing[2],
    },
    centered: { textAlign: 'center' as const },
  };
}
