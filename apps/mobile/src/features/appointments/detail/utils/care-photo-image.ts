import * as FileSystem from 'expo-file-system/legacy';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';

/** Télécharge la photo de soin (auth) vers le cache local pour affichage Image / lightbox. */
export async function loadCarePhotoLocalUri(documentId: string): Promise<string | null> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) return null;
  const token = getAuthToken();
  const url = `${getApiBase()}/medical-documents/${encodeURIComponent(documentId)}/download`;
  const dest = `${dir}care-photo-${documentId}.jpg`;
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) return dest;
    const result = await FileSystem.downloadAsync(url, dest, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (result.status >= 200 && result.status < 300) return dest;
  } catch {
    /* ignore */
  }
  return null;
}
