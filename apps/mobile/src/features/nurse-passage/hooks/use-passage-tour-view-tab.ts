import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PassageTourViewTab } from '@oneandlab/shared-types';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'nurse_tour_view_tab_v1';

export function usePassageTourViewTab(defaultTab: PassageTourViewTab = 'manual') {
  const [tab, setTabState] = useState<PassageTourViewTab>(defaultTab);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'intelligent' || stored === 'manual') {
          setTabState(stored);
        }
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setTab = useCallback((next: PassageTourViewTab) => {
    setTabState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { tab, setTab, ready };
}
