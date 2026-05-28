import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MAX_UPLOAD_BYTES } from './upload-file';

export type CarePhotoPickSource = 'camera' | 'library';

export type CarePhotoPickResult = {
  uri: string;
  fileName: string;
  mimeType: string;
};

function defaultFileName(mimeType: string): string {
  if (mimeType.includes('heic') || mimeType.includes('heif')) return 'photo.heic';
  if (mimeType.includes('png')) return 'photo.png';
  if (mimeType.includes('webp')) return 'photo.webp';
  return 'photo.jpg';
}

function metaFromAsset(asset: ImagePicker.ImagePickerAsset): CarePhotoPickResult {
  const uri = asset.uri;
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const fileName = asset.fileName ?? defaultFileName(mimeType);
  return { uri, fileName, mimeType };
}

async function pickFromLibrary(): Promise<CarePhotoPickResult | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('PERMISSION_LIBRARY');
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets[0]?.uri) return null;
  const asset = res.assets[0];
  if (asset.fileSize != null && asset.fileSize > MAX_UPLOAD_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  return metaFromAsset(asset);
}

async function pickFromCamera(): Promise<CarePhotoPickResult | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error('PERMISSION_CAMERA');
  }
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets[0]?.uri) return null;
  const asset = res.assets[0];
  if (asset.fileSize != null && asset.fileSize > MAX_UPLOAD_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  return metaFromAsset(asset);
}

function chooseSource(): Promise<CarePhotoPickSource | null> {
  return new Promise((resolve) => {
    const select = (index: number) => {
      if (index === 0) resolve('camera');
      else if (index === 1) resolve('library');
      else resolve(null);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Prendre une photo', 'Choisir dans la galerie', 'Annuler'],
          cancelButtonIndex: 2,
        },
        select,
      );
      return;
    }

    Alert.alert('Ajouter une photo', undefined, [
      { text: 'Prendre une photo', onPress: () => resolve('camera') },
      { text: 'Galerie', onPress: () => resolve('library') },
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/** Photo : appareil photo ou galerie (max 25 Mo). */
export async function pickCarePhoto(): Promise<CarePhotoPickResult | null> {
  const source = await chooseSource();
  if (!source) return null;
  if (source === 'camera') return pickFromCamera();
  return pickFromLibrary();
}

/** @deprecated Préférer `pickCarePhoto()` pour récupérer aussi le MIME. */
export async function pickCarePhotoUri(): Promise<string | null> {
  const picked = await pickCarePhoto();
  return picked?.uri ?? null;
}

export function carePhotoPickErrorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : '';
  if (code === 'PERMISSION_CAMERA') {
    return 'Autorisez l’accès à l’appareil photo dans les réglages.';
  }
  if (code === 'PERMISSION_LIBRARY') {
    return 'Autorisez l’accès aux photos dans les réglages.';
  }
  if (code === 'FILE_TOO_LARGE') {
    return 'Photo trop volumineuse (maximum 25 Mo).';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Impossible de sélectionner la photo.';
}
