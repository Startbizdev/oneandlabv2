import * as FileSystem from 'expo-file-system/legacy';
import { MAX_UPLOAD_BYTES } from './upload-limits';
import type { UploadFileInput } from './upload-file';
import { inspectMedDocFile, inspectMedDocFilePair, logMedDoc } from './medical-doc-file-debug';

async function getFileSize(uri: string): Promise<number | null> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || !('size' in info) || info.size == null) return null;
  return info.size;
}

export async function assertUploadSize(uri: string): Promise<void> {
  const size = await getFileSize(uri);
  if (size != null && size > MAX_UPLOAD_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  if (size != null && size < 512) {
    throw new Error('FILE_EMPTY');
  }
}

function safeBaseName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^./\\]+$/, '').trim();
  const safe = withoutExt.replace(/[/\\?%*:|"<>]/g, '-');
  return safe || 'document';
}

function normalizeMime(mimeType: string | undefined, fileName: string): string {
  const raw = (mimeType ?? '').toLowerCase();
  if (raw === 'image/jpg') return 'image/jpeg';
  if (raw) return raw;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function extensionForFile(mimeType: string, fileName: string): string {
  const lower = fileName.toLowerCase();
  const match = lower.match(/\.(jpe?g|png|webp|heic|heif|pdf)$/i);
  if (match) return match[0];
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('heic') || mimeType.includes('heif')) return '.heic';
  return '.jpg';
}

/**
 * Prépare un fichier pour POST multipart.
 * — Copie vers le cache (URI caméra temporaire / content:// Android).
 * — Aucune recompression ImageManipulator (photos noires sur appareil photo).
 * — La compression se fait à la prise de vue (ImagePicker quality).
 */
export async function prepareMedicalUploadFile(file: UploadFileInput): Promise<UploadFileInput> {
  logMedDoc('prepare:IN', {
    uri: file.uri,
    fileName: file.fileName,
    mimeType: file.mimeType,
  });
  await inspectMedDocFile(file.uri, 'prepare:source');

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('Stockage temporaire indisponible.');
  }

  const mimeType = normalizeMime(file.mimeType, file.fileName);
  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');

  if (!isPdf && !isImage) {
    throw new Error('INVALID_FORMAT');
  }

  const ext = extensionForFile(mimeType, file.fileName);
  const destName = `${safeBaseName(file.fileName)}${ext}`;
  const destUri = `${cacheDir}medical-upload-${Date.now()}-${destName}`;

  await FileSystem.copyAsync({ from: file.uri, to: destUri });
  await assertUploadSize(destUri);
  await inspectMedDocFilePair(file.uri, destUri, 'prepare:copy');

  const out = {
    ...file,
    uri: destUri,
    fileName: destName,
    mimeType,
  };
  logMedDoc('prepare:OUT', out);
  return out;
}
