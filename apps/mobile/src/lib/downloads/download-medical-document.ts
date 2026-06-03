import * as FileSystem from 'expo-file-system/legacy';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';
import { openLocalFile } from './open-local-file';

function safeFileName(name: string, fallbackId: string): string {
  const base = (name.trim() || `document-${fallbackId}`).replace(/[/\\?%*:|"<>]/g, '-');
  return base.includes('.') ? base : `${base}.bin`;
}

/** Télécharge un document médical authentifié vers le cache local. */
export async function fetchMedicalDocumentToCache(
  documentId: string,
  fileName?: string,
): Promise<{ ok: boolean; localUri?: string; error?: string }> {
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

    return { ok: true, localUri: result.uri };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Impossible de télécharger le document.',
    };
  }
}

/**
 * Télécharge puis ouvre le document (PDF, image…) via les APIs Expo
 * (Intent Android / partage iOS avec aperçu et enregistrement).
 */
export async function openMedicalDocument(
  documentId: string,
  fileName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const downloaded = await fetchMedicalDocumentToCache(documentId, fileName);
  if (!downloaded.ok || !downloaded.localUri) {
    return { ok: false, error: downloaded.error };
  }
  return openLocalFile(downloaded.localUri, fileName);
}

/** @deprecated Utiliser `openMedicalDocument`. */
export async function downloadMedicalDocument(
  documentId: string,
  fileName?: string,
): Promise<{ ok: boolean; error?: string }> {
  return openMedicalDocument(documentId, fileName);
}
