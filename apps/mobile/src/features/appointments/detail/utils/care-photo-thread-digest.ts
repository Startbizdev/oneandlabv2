import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CarePhotoRow } from '../api/appointment-detail.service';

/** Empreinte des commentaires d’une photo (badges « nouveau »). */
export function carePhotoCommentsDigest(ids: Iterable<string>): string {
  return [...ids].map(String).sort().join('|');
}

export function carePhotoSeenStorageKey(appointmentId: string, docId: string): string {
  return `oal_cp_seen:v1:${appointmentId}:${docId}`;
}

export async function readCarePhotoSeenDigest(
  appointmentId: string,
  docId: string,
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(carePhotoSeenStorageKey(appointmentId, docId));
  } catch {
    return null;
  }
}

export async function writeCarePhotoSeenDigest(
  appointmentId: string,
  docId: string,
  digest: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(carePhotoSeenStorageKey(appointmentId, docId), digest);
  } catch {
    /* ignore */
  }
}

export async function markCarePhotoThreadSeen(
  appointmentId: string,
  photo: Pick<CarePhotoRow, 'id' | 'comments'>,
): Promise<void> {
  const digest = carePhotoCommentsDigest((photo.comments ?? []).map((c) => c.id));
  await writeCarePhotoSeenDigest(appointmentId, photo.id, digest);
}

export async function markAllCarePhotoThreadsSeen(
  appointmentId: string,
  photos: ReadonlyArray<Pick<CarePhotoRow, 'id' | 'comments'>>,
): Promise<void> {
  await Promise.all(photos.map((p) => markCarePhotoThreadSeen(appointmentId, p)));
}

/** Messages d’autres auteurs non encore « vus » sur un fil (photo ou fil texte). */
export async function countUnreadOnComments(
  appointmentId: string,
  documentId: string,
  comments: ReadonlyArray<CarePhotoComment>,
  viewerUserId?: string,
): Promise<number> {
  const stored = (await readCarePhotoSeenDigest(appointmentId, documentId)) ?? '';
  const seenIds = new Set(stored.split('|').filter(Boolean));
  const viewer = viewerUserId != null ? String(viewerUserId) : '';
  let n = 0;
  for (const c of comments) {
    const cid = String(c.id ?? '');
    if (!cid || seenIds.has(cid)) continue;
    if (viewer && String(c.author_id) === viewer) continue;
    n += 1;
  }
  return n;
}

/** Messages d’autres auteurs non encore « vus » sur une photo. */
export async function countUnreadOnPhoto(
  appointmentId: string,
  photo: CarePhotoRow,
  viewerUserId?: string,
): Promise<number> {
  return countUnreadOnComments(appointmentId, photo.id, photo.comments ?? [], viewerUserId);
}

export async function countUnreadCarePhotos(
  appointmentId: string,
  photos: ReadonlyArray<CarePhotoRow>,
  viewerUserId?: string,
  thread?: { document_id: string; comments: CarePhotoComment[] } | null,
): Promise<number> {
  let total = 0;
  for (const p of photos) {
    total += await countUnreadOnPhoto(appointmentId, p, viewerUserId);
  }
  if (thread?.document_id) {
    total += await countUnreadOnComments(
      appointmentId,
      thread.document_id,
      thread.comments ?? [],
      viewerUserId,
    );
  }
  return total;
}

export function sortPhotosChronologically(photos: ReadonlyArray<CarePhotoRow>): CarePhotoRow[] {
  return [...photos].sort((a, b) =>
    String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')),
  );
}

export function latestCarePhoto(photos: ReadonlyArray<CarePhotoRow>): CarePhotoRow | null {
  const sorted = sortPhotosChronologically(photos);
  return sorted[sorted.length - 1] ?? null;
}
