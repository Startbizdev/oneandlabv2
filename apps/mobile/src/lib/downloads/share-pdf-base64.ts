import * as FileSystem from 'expo-file-system/legacy';
import { openLocalFile } from './open-local-file';

export async function sharePdfFromBase64(
  base64: string,
  fileName: string,
): Promise<{ ok: boolean; localUri?: string; error?: string }> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    return { ok: false, error: 'Stockage temporaire indisponible.' };
  }

  const safeName = (fileName.trim() || 'ordonnance.pdf').replace(/[/\\?%*:|"<>]/g, '-');
  const dest = `${dir}${safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`}`;

  try {
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const opened = await openLocalFile(dest, safeName);
    if (!opened.ok) {
      return { ok: false, error: opened.error };
    }
    return { ok: true, localUri: dest };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Impossible d’ouvrir le PDF.',
    };
  }
}
