import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NetworkContextValue = { isOnline: boolean };

const NetworkContext = createContext<NetworkContextValue>({ isOnline: true });

const CHECK_INTERVAL_MS = 30_000;
const CHECK_TIMEOUT_MS = 8_000;
/** Évite les faux positifs (iOS suspend les fetch en arrière-plan). */
const FAILURES_BEFORE_OFFLINE = 2;

async function probeConnectivity(signal: AbortSignal): Promise<boolean> {
  const res = await fetch('https://clients3.google.com/generate_204', {
    method: 'HEAD',
    cache: 'no-store',
    signal,
  });
  return res.ok;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const insets = useSafeAreaInsets();
  const failureCountRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const checkInFlightRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      if (appStateRef.current !== 'active' || checkInFlightRef.current) return;

      checkInFlightRef.current = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

      try {
        const ok = await probeConnectivity(controller.signal);
        if (!mounted || appStateRef.current !== 'active') return;

        if (ok) {
          failureCountRef.current = 0;
          setIsOnline(true);
          return;
        }

        failureCountRef.current += 1;
        if (failureCountRef.current >= FAILURES_BEFORE_OFFLINE) {
          setIsOnline(false);
        }
      } catch {
        if (!mounted || appStateRef.current !== 'active') return;

        failureCountRef.current += 1;
        if (failureCountRef.current >= FAILURES_BEFORE_OFFLINE) {
          setIsOnline(false);
        }
      } finally {
        clearTimeout(timeout);
        checkInFlightRef.current = false;
      }
    };

    const appSub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
      if (next !== 'active') return;

      // Retour au premier plan : on repart optimiste, puis on re-vérifie.
      failureCountRef.current = 0;
      setIsOnline(true);
      void check();
    });

    void check();
    const id = setInterval(() => void check(), CHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(id);
      appSub.remove();
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
      {!isOnline ? (
        <View
          className="absolute left-0 right-0 bg-amber-600 px-4 py-2 z-50"
          style={{ top: insets.top }}
        >
          <Text className="text-white text-center text-xs font-semibold">
            Hors ligne — les données peuvent être obsolètes
          </Text>
        </View>
      ) : null}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkContext);
}
