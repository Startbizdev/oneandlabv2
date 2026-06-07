import * as FileSystem from 'expo-file-system/legacy';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';
import { openLocalFile } from './open-local-file';
import { inspectMedDocFile, logMedDoc } from '@/lib/uploads/medical-doc-file-debug';

function cacheDir(): string {
  return FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
}

function fileExtension(fileName?: string): string {
  const name = fileName?.trim() ?? '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  const ext = name.slice(dot).toLowerCase();
  return ext.length <= 12 ? ext : '';
}

/** Chemin cache stable par id document (le file_name API peut varier). */
export function getMedicalDocumentCachePath(documentId: string, fileName?: string): string {
  const ext = fileExtension(fileName) || '.bin';
  return `${cacheDir()}medical-doc-${documentId}${ext}`;
}

/** Ancien schéma (file_name dans le nom) — relecture des fichiers déjà en cache. */
function legacyMedicalDocumentCachePath(documentId: string, fileName?: string): string {
  const base = (fileName?.trim() || `document-${documentId}`).replace(/[/\\?%*:|"<>]/g, '-');
  const safe = base.includes('.') ? base : `${base}.bin`;
  return `${cacheDir()}${safe}`;
}

async function uriIfExists(path: string): Promise<string | null> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  return info.uri ?? path;
}

/** Copie le fichier local vers le cache stable après upload (évite re-téléchargement). */
export async function seedMedicalDocumentCache(
  documentId: string,
  fileName: string | undefined,
  sourceUri: string,
): Promise<string | null> {
  const dest = getMedicalDocumentCachePath(documentId, fileName);
  try {
    const info = await FileSystem.getInfoAsync(sourceUri);
    if (!info.exists) {
      logMedDoc('cache:SEED_SKIP', { documentId, reason: 'source missing', sourceUri });
      return null;
    }
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    await inspectMedDocFile(dest, 'cache:seed');
    logMedDoc('cache:SEED_OK', { documentId, dest });
    return dest;
  } catch (e) {
    logMedDoc('cache:SEED_FAIL', {
      documentId,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/** Retourne l’URI locale si le document est déjà en cache (chemin stable par id). */
export async function getCachedMedicalDocumentUri(
  documentId: string,
  fileName?: string,
): Promise<string | null> {
  const primary = await uriIfExists(getMedicalDocumentCachePath(documentId, fileName));
  if (primary) {
    logMedDoc('cache:HIT', { documentId, fileName, scheme: 'primary', uri: primary });
    return primary;
  }

  // Ancien schéma sans id dans le nom (ex. photo.jpg) — collision entre documents :
  // ne jamais réutiliser un fichier générique pour un autre id.
  if (fileName?.trim()) {
    logMedDoc('cache:MISS', { documentId, fileName, reason: 'primary absent, legacy filename skipped' });
    return null;
  }

  const legacy = await uriIfExists(legacyMedicalDocumentCachePath(documentId, fileName));
  if (legacy) {
    logMedDoc('cache:HIT', { documentId, scheme: 'legacy-id-only', uri: legacy });
  } else {
    logMedDoc('cache:MISS', { documentId, fileName: null });
  }
  return legacy;
}

/** Télécharge un document médical authentifié vers le cache local. */
async function fetchMedicalDocumentToCache(
  documentId: string,
  fileName?: string,
): Promise<{ ok: boolean; localUri?: string; error?: string }> {
  const dir = cacheDir();
  if (!dir) {
    return { ok: false, error: 'Stockage temporaire indisponible.' };
  }

  const token = getAuthToken();
  const url = `${getApiBase()}/medical-documents/${encodeURIComponent(documentId)}/download`;
  const dest = getMedicalDocumentCachePath(documentId, fileName);

  logMedDoc('download:START', { documentId, fileName, url, dest });

  try {
    const result = await FileSystem.downloadAsync(url, dest, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    logMedDoc('download:HTTP', {
      status: result.status,
      uri: result.uri,
      mimeType: result.headers?.['content-type'] ?? result.headers?.['Content-Type'] ?? null,
      contentLength:
        result.headers?.['content-length'] ?? result.headers?.['Content-Length'] ?? null,
    });

    if (result.status < 200 || result.status >= 300) {
      return {
        ok: false,
        error: result.status === 404 ? 'Document introuvable.' : `Erreur serveur (${result.status}).`,
      };
    }

    const localUri = await uriIfExists(result.uri || dest);
    if (!localUri) {
      return { ok: false, error: 'Fichier téléchargé introuvable en local.' };
    }

    await inspectMedDocFile(localUri, 'download:cached');
    logMedDoc('download:OK', { localUri });

    return { ok: true, localUri };
  } catch (e) {
    logMedDoc('download:FAIL', {
      documentId,
      error: e instanceof Error ? e.message : String(e),
    });
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Impossible de télécharger le document.',
    };
  }
}

export async function cacheMedicalDocument(
  documentId: string,
  fileName?: string,
): Promise<{ ok: boolean; localUri?: string; error?: string }> {
  return fetchMedicalDocumentToCache(documentId, fileName);
}

/**
 * Télécharge puis ouvre le document (PDF, image…) via les APIs Expo
 * (Intent Android / partage iOS avec aperçu et enregistrement).
 */
export async function openMedicalDocument(
  documentId: string,
  fileName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const downloaded = await cacheMedicalDocument(documentId, fileName);
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
