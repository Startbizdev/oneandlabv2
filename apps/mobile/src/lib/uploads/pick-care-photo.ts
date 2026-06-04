import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { MAX_UPLOAD_BYTES } from './upload-file';

export type CarePhotoPickSource = 'camera' | 'library' | 'file';

export type CarePhotoPickResult = {
  uri: string;
  fileName: string;
  mimeType: string;
};

const CARE_PHOTO_MIME = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
] as const;

function defaultFileName(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'document.pdf';
  if (mimeType.includes('heic') || mimeType.includes('heif')) return 'photo.heic';
  if (mimeType.includes('png')) return 'photo.png';
  if (mimeType.includes('webp')) return 'photo.webp';
  return 'photo.jpg';
}

function normalizeMime(mimeType: string | undefined | null, fileName: string): string {
  const raw = (mimeType ?? '').toLowerCase();
  if (raw && CARE_PHOTO_MIME.includes(raw as (typeof CARE_PHOTO_MIME)[number])) return raw;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function assertSize(fileSize: number | undefined | null) {
  if (fileSize != null && fileSize > MAX_UPLOAD_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
}

function metaFromAsset(asset: ImagePicker.ImagePickerAsset): CarePhotoPickResult {
  const uri = asset.uri;
  const mimeType = normalizeMime(asset.mimeType, asset.fileName ?? '');
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
  assertSize(asset.fileSize);
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
  assertSize(asset.fileSize);
  return metaFromAsset(asset);
}

async function pickFromFiles(): Promise<CarePhotoPickResult | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.[0]?.uri) return null;
  const asset = res.assets[0];
  assertSize(asset.size ?? undefined);
  const fileName = asset.name ?? defaultFileName(asset.mimeType ?? '');
  const mimeType = normalizeMime(asset.mimeType, fileName);
  if (!CARE_PHOTO_MIME.includes(mimeType as (typeof CARE_PHOTO_MIME)[number])) {
    throw new Error('INVALID_FORMAT');
  }
  return { uri: asset.uri, fileName, mimeType };
}

function chooseSource(): Promise<CarePhotoPickSource | null> {
  return new Promise((resolve) => {
    const select = (index: number) => {
      if (index === 0) resolve('camera');
      else if (index === 1) resolve('library');
      else if (index === 2) resolve('file');
      else resolve(null);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Appareil photo', 'Galerie', 'Fichier', 'Annuler'],
          cancelButtonIndex: 3,
        },
        select,
      );
      return;
    }

    Alert.alert('Ajouter un fichier', undefined, [
      { text: 'Appareil photo', onPress: () => resolve('camera') },
      { text: 'Galerie', onPress: () => resolve('library') },
      { text: 'Fichier', onPress: () => resolve('file') },
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/** Image ou PDF : appareil, galerie ou fichier (max 25 Mo). */
export async function pickCarePhoto(): Promise<CarePhotoPickResult | null> {
  const source = await chooseSource();
  if (!source) return null;
  if (source === 'camera') return pickFromCamera();
  if (source === 'library') return pickFromLibrary();
  return pickFromFiles();
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
    return 'Fichier trop volumineux (maximum 25 Mo).';
  }
  if (code === 'INVALID_FORMAT') {
    return 'Format non accepté. Utilisez une image (JPG, PNG, HEIC) ou un PDF.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Impossible de sélectionner le fichier.';
}
