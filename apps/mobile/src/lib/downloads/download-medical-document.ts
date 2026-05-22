import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';

function safeFileName(name: string, fallbackId: string): string {
  const base = (name.trim() || `document-${fallbackId}`).replace(/[/\\?%*:|"<>]/g, '-');
  return base.includes('.') ? base : `${base}.bin`;
}

/**
 * Télécharge un document médical authentifié puis ouvre la feuille de partage système
 * (enregistrer dans Fichiers, ouvrir dans une autre app, etc.).
 */
export async function downloadMedicalDocument(
  documentId: string,
  fileName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    return { ok: false, error: 'Stockage temporaire indisponible.' };
  }

  const token = getAuthToken();
  const url = `${getApiBase()}/medical-documents/${encodeURIComponent(documentId)}/download`;
  const dest = `${dir}${safeFileName(fileName ?? '', documentId)}`;

  try {
    const result = await FileSystem.downloadAsync(url, dest, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (result.status < 200 || result.status >= 300) {
      return {
        ok: false,
        error: result.status === 404 ? 'Document introuvable.' : `Erreur serveur (${result.status}).`,
      };
    }

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: 'Le partage de fichiers n’est pas disponible sur cet appareil.' };
    }

    await Sharing.shareAsync(result.uri, { dialogTitle: 'Document médical' });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Impossible de télécharger le document.',
    };
  }
}
