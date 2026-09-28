import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { carePhotoPickErrorMessage } from '@/lib/uploads/pick-care-photo';
import { useToast } from '@/providers/ToastProvider';

export type ProfileImageTarget = 'profile' | 'cover';

/** Sélection + compression d'une photo de profil ; affiche l'erreur et renvoie null en cas d'échec. */
export function usePickProfileImage() {
  const [picking, setPicking] = useState<ProfileImageTarget | null>(null);
  const { show: toast } = useToast();

  const pickImage = useCallback(async (target: ProfileImageTarget): Promise<string | null> => {
    setPicking(target);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('PERMISSION_LIBRARY');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: target === 'cover' ? [2, 1] : [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets[0]?.uri) return null;

      const { imageUriToDataUrl } = await import('@/lib/images/image-to-data-url');
      return await imageUriToDataUrl(result.assets[0].uri);
    } catch (err) {
      console.warn('[usePickProfileImage]', err);
      toast(carePhotoPickErrorMessage(err), { type: 'error' });
      return null;
    } finally {
      setPicking(null);
    }
  }, [toast]);

  return { picking, pickImage, isPicking: picking !== null };
}
