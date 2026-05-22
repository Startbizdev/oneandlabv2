import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: 'Le partage de fichiers n’est pas disponible sur cet appareil.' };
    }

    await Sharing.shareAsync(dest, {
      mimeType: 'application/pdf',
      dialogTitle: 'Ordonnance',
    });
    return { ok: true, localUri: dest };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Impossible de partager le PDF.',
    };
  }
}
