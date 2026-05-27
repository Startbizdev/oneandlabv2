import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { CarePhotoRow } from '../api/appointment-detail.service';
import { countUnreadCarePhotos } from '../utils/care-photo-thread-digest';

const POLL_MS = 8000;

export function useCarePhotoUnread(
  appointmentId: string | undefined,
  photos: ReadonlyArray<CarePhotoRow>,
  viewerUserId?: string,
) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!appointmentId || photos.length === 0) {
      setUnread(0);
      return;
    }
    const n = await countUnreadCarePhotos(appointmentId, photos, viewerUserId);
    setUnread(n);
  }, [appointmentId, photos, viewerUserId]);

  useEffect(() => {
    void refresh();
    if (!appointmentId || photos.length === 0) return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [appointmentId, photos, refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { unread, refreshUnread: refresh };
}
