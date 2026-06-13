import * as FileSystem from 'expo-file-system/legacy';
import { sanitizeLocalFileName } from './open-local-file';

/** Écrit un PDF base64 en cache local sans ouvrir le lecteur système. */
export async function cachePdfFromBase64(
  base64: string,
  fileName: string,
): Promise<{ ok: boolean; localUri?: string; error?: string }> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    return { ok: false, error: 'Stockage temporaire indisponible.' };
  }

  const base = sanitizeLocalFileName(fileName.trim() || 'ordonnance');
  const safeName = base.endsWith('.pdf') ? base : `${base}.pdf`;
  const dest = `${dir}${safeName}`;

  try {
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { ok: true, localUri: dest };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Impossible de préparer le PDF.',
    };
  }
}
