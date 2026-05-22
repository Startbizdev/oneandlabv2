import * as DocumentPicker from 'expo-document-picker';
import { MAX_UPLOAD_BYTES } from './upload-file';

export type PickedMedicalDocument = {
  uri: string;
  fileName: string;
  mimeType: string;
};

function guessMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

/** Sélection image ou PDF (aligné web, max 25 Mo). */
export async function pickMedicalDocumentFile(): Promise<PickedMedicalDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  if (asset.size != null && asset.size > MAX_UPLOAD_BYTES) {
    throw new Error('Fichier trop volumineux (maximum 25 Mo).');
  }

  const fileName = asset.name ?? 'document';
  return {
    uri: asset.uri,
    fileName,
    mimeType: asset.mimeType ?? guessMime(fileName),
  };
}
