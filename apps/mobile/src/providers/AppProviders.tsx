import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { queryClient } from '@/lib/query-client';
import { persistQueryOptions } from '@/lib/query-persist';
import { ToastProvider } from './ToastProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistQueryOptions}>
          <ToastProvider>
            {/* Hôte unique pour tous les bottom sheets (gorhom) : un seul portail,
                plus de <Modal> natifs empilés → fini les flashs / réouvertures. */}
            <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
          </ToastProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
