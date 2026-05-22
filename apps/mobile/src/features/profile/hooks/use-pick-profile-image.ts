import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

export type ProfileImageTarget = 'profile' | 'cover';

export function usePickProfileImage() {
  const [picking, setPicking] = useState<ProfileImageTarget | null>(null);

  const pickImage = useCallback(async (target: ProfileImageTarget): Promise<string | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;

    setPicking(target);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: target === 'cover' ? [2, 1] : [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets[0]?.uri) return null;

      const { imageUriToDataUrl } = await import('@/lib/images/image-to-data-url');
      return await imageUriToDataUrl(result.assets[0].uri);
    } finally {
      setPicking(null);
    }
  }, []);

  return { picking, pickImage, isPicking: picking !== null };
}
