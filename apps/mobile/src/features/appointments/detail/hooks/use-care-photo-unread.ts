import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { CarePhotoComment, CarePhotoRow } from '../api/appointment-detail.service';
import { countUnreadCarePhotos } from '../utils/care-photo-thread-digest';

const POLL_MS = 8000;

export function useCarePhotoUnread(
  appointmentId: string | undefined,
  photos: ReadonlyArray<CarePhotoRow>,
  viewerUserId?: string,
  thread?: { document_id: string; comments: CarePhotoComment[] } | null,
) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!appointmentId) {
      setUnread(0);
      return;
    }
    if (photos.length === 0 && !thread?.document_id) {
      setUnread(0);
      return;
    }
    const n = await countUnreadCarePhotos(appointmentId, photos, viewerUserId, thread);
    setUnread(n);
  }, [appointmentId, photos, viewerUserId, thread]);

  useEffect(() => {
    void refresh();
    if (!appointmentId || (photos.length === 0 && !thread?.document_id)) return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [appointmentId, photos, thread, refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { unread, refreshUnread: refresh };
}
