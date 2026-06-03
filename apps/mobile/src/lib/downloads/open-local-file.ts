import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

export function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

/**
 * Ouvre un fichier local : lecteur PDF / image système (Android) ou feuille de partage
 * iOS (aperçu Quick Look + enregistrer dans Fichiers).
 */
export async function openLocalFile(
  localUri: string,
  fileName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const name = (fileName?.trim() || 'document').replace(/[/\\?%*:|"<>]/g, '-');
  const mimeType = guessMimeType(name);

  try {
    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(localUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: mimeType,
      });
      return { ok: true };
    }

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: 'L’ouverture de fichiers n’est pas disponible sur cet appareil.' };
    }

    await Sharing.shareAsync(localUri, {
      mimeType,
      dialogTitle: name,
      UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('dismiss')) {
      return { ok: true };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Impossible d’ouvrir le document.',
    };
  }
}
