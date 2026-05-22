import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NetworkContextValue = { isOnline: boolean };

const NetworkContext = createContext<NetworkContextValue>({ isOnline: true });

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (mounted) setIsOnline(res.ok);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };
    void check();
    const id = setInterval(() => void check(), 30_000);
    return () => {
      mounted = false;
      clearInterval(id);
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
