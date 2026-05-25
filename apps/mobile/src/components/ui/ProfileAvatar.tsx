import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { avatarDisplaySeed, personasAvatarUrl } from '@/lib/images/dicebear-personas-url';
import { resolveProfileImageUrl } from '@/lib/images/profile-image-url';
import { colors } from '@/theme';

interface Props {
  profileImageUrl?: string | null;
  /** Identifiant stable pour le même avatar Personas (nom, id…). */
  seed?: string;
  /** Genre profil (male | female | other) — influence Personas ; absent = aléatoire selon le seed. */
  gender?: string | null;
  size: number;
  /** Floute la photo (offres en attente — Mes demandes infirmier). */
  blurred?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

function ProfileAvatarComponent({
  profileImageUrl,
  seed,
  gender,
  size,
  blurred = false,
  style,
  imageStyle,
}: Props) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const displaySeed = avatarDisplaySeed(seed ?? 'cary-user');
  const photoUri = useMemo(() => resolveProfileImageUrl(profileImageUrl), [profileImageUrl]);

  useEffect(() => {
    setPhotoFailed(false);
  }, [profileImageUrl]);
  const fallbackUri = useMemo(
    () => personasAvatarUrl(displaySeed, size * 2, gender),
    [displaySeed, gender, size],
  );
  const uri = photoUri && !photoFailed ? photoUri : fallbackUri;
  const radius = size / 2;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: colors.primaryLight,
        },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={[{ width: size, height: size }, imageStyle]}
        resizeMode="cover"
        onError={() => {
          if (photoUri && !photoFailed) setPhotoFailed(true);
        }}
      />
      {blurred ? (
        <BlurView
          intensity={Platform.OS === 'ios' ? 28 : 48}
          tint="light"
          style={StyleSheet.absoluteFillObject}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
      ) : null}
    </View>
  );
}

export const ProfileAvatar = React.memo(ProfileAvatarComponent);
