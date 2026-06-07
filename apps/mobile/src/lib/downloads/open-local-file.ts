import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

export function sanitizeLocalFileName(fileName?: string): string {
  return (fileName?.trim() || 'document').replace(/[/\\?%*:|"<>]/g, '-');
}

export function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'application/octet-stream';
}

/**
 * Feuille de partage système → enregistrer dans Fichiers, Drive, Photos, etc.
 */
export async function exportLocalFile(
  localUri: string,
  fileName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const name = sanitizeLocalFileName(fileName);
  const mimeType = guessMimeType(name);

  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: 'L’enregistrement n’est pas disponible sur cet appareil.' };
    }

    await Sharing.shareAsync(localUri, {
      mimeType,
      dialogTitle: `Enregistrer ${name}`,
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
      error: e instanceof Error ? e.message : 'Impossible d’enregistrer le document.',
    };
  }
}

/**
 * Ouvre un fichier local : lecteur PDF / image système (Android) ou feuille de partage
 * iOS (aperçu Quick Look + enregistrer dans Fichiers).
 */
export async function openLocalFile(
  localUri: string,
  fileName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const name = sanitizeLocalFileName(fileName);
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
