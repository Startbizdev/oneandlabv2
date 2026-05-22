import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { avatarDisplaySeed } from '@/lib/images/dicebear-personas-url';
import { resolveAvatarImageUrl } from '@/lib/images/profile-image-url';
import { colors } from '@/theme';

interface Props {
  profileImageUrl?: string | null;
  /** Identifiant stable pour le même avatar Personas (nom, id…). */
  seed?: string;
  /** Genre profil (male | female | other) — influence Personas ; absent = aléatoire selon le seed. */
  gender?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

function ProfileAvatarComponent({
  profileImageUrl,
  seed,
  gender,
  size,
  style,
  imageStyle,
}: Props) {
  const displaySeed = avatarDisplaySeed(seed ?? 'cary-user');
  const uri = resolveAvatarImageUrl(profileImageUrl, displaySeed, size * 2, gender);
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
      />
    </View>
  );
}

export const ProfileAvatar = React.memo(ProfileAvatarComponent);
