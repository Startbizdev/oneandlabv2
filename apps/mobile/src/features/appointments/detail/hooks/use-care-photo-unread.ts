import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { CarePhotoComment, CarePhotoRow } from '../api/appointment-detail.service';
import { countUnreadCarePhotos } from '../utils/care-photo-thread-digest';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';

const POLL_MS = 8000;

export function useCarePhotoUnread(
  appointmentId: string | undefined,
  photos: ReadonlyArray<CarePhotoRow>,
  viewerUserId?: string,
  thread?: { document_id: string; comments: CarePhotoComment[] } | null,
) {
  const [unread, setUnread] = useState(0);
  const focused = useIsFocused();
  const appActive = useAppActive();

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

  const pollEvery = focusedRefetchInterval(POLL_MS, focused, appActive);

  useEffect(() => {
    void refresh();
    if (!appointmentId || (photos.length === 0 && !thread?.document_id)) return;
    if (pollEvery === false) return;
    const t = setInterval(() => void refresh(), pollEvery);
    return () => clearInterval(t);
  }, [appointmentId, photos, thread, refresh, pollEvery]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { unread, refreshUnread: refresh };
}
