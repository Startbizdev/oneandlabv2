/** Empreinte des commentaires d’une photo (pour badges « nouveau » sans rechargement complet). */

export function carePhotoCommentsDigest(ids: Iterable<string>): string {
  return [...ids].map(String).sort().join('|');
}

export function carePhotoSeenStorageKey(appointmentId: string, docId: string): string {
  return `oal_cp_seen:v1:${appointmentId}:${docId}`;
}

export function readCarePhotoSeenDigest(appointmentId: string, docId: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(carePhotoSeenStorageKey(appointmentId, docId));
  } catch {
    return null;
  }
}

export function writeCarePhotoSeenDigest(appointmentId: string, docId: string, digest: string) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(carePhotoSeenStorageKey(appointmentId, docId), digest);
  } catch {
    /* ignore quota */
  }
}
