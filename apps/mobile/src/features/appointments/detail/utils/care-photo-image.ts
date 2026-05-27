import * as FileSystem from 'expo-file-system/legacy';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';

function cachePath(documentId: string): string | null {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) return null;
  return `${dir}care-photo-${documentId}.bin`;
}

/** Télécharge la photo de soin (auth) vers le cache local pour affichage Image / lightbox. */
export async function loadCarePhotoLocalUri(
  documentId: string,
  opts?: { bustCache?: boolean },
): Promise<string | null> {
  const dest = cachePath(documentId);
  if (!dest) return null;

  const token = getAuthToken();
  const url = `${getApiBase()}/medical-documents/${encodeURIComponent(documentId)}/download`;

  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (opts?.bustCache && info.exists) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } else if (info.exists && info.size != null && info.size > 0) {
      return dest;
    }

    const result = await FileSystem.downloadAsync(url, dest, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (result.status >= 200 && result.status < 300) {
      const saved = await FileSystem.getInfoAsync(dest);
      if (saved.exists && saved.size != null && saved.size > 0) return dest;
    }

    await FileSystem.deleteAsync(dest, { idempotent: true });
  } catch {
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
  return null;
}
