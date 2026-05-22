import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'downloaded-docs:';

export function useDownloadedDocumentIds(scopeKey: string) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_PREFIX + scopeKey);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed)) setIds(new Set(parsed));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scopeKey]);

  const markDownloaded = useCallback(
    async (documentId: string) => {
      setIds((prev) => {
        const next = new Set(prev);
        next.add(documentId);
        void AsyncStorage.setItem(
          STORAGE_PREFIX + scopeKey,
          JSON.stringify([...next]),
        );
        return next;
      });
    },
    [scopeKey],
  );

  const isDownloaded = useCallback((documentId: string) => ids.has(documentId), [ids]);

  return { isDownloaded, markDownloaded, ready };
}
