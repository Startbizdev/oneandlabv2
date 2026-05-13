/**
 * Composable pour le polling des notifications
 */

export type UsePollingOptions = {
  /** Si true, le tick est ignoré (ex. création RDV : évite la contention avec le backend). */
  shouldSkip?: () => boolean;
};

export const usePolling = (
  callback: () => Promise<void>,
  interval = 30000,
  options?: UsePollingOptions,
) => {
  let intervalId: NodeJS.Timeout | null = null;
  const isPolling = ref(false);
  const instanceId = Math.random().toString(36).substring(7);

  const tick = () => {
    if (options?.shouldSkip?.()) {
      return Promise.resolve();
    }
    return callback();
  };
  
  const start = () => {
    // Si déjà en cours, ne pas redémarrer
    if (intervalId !== null) {
      console.log(`[Polling:${instanceId}] Already polling, skipping start`);
      return;
    }
    
    console.log(`[Polling:${instanceId}] Starting polling (interval: ${interval}ms)`);
    isPolling.value = true;
    
    // Exécuter immédiatement
    tick().catch(err => {
      console.error(`[Polling:${instanceId}] Error in callback:`, err);
    });
    
    // Puis toutes les X secondes
    intervalId = setInterval(() => {
      tick().catch(err => {
        console.error(`[Polling:${instanceId}] Error in callback:`, err);
      });
    }, interval);
  };
  
  const stop = () => {
    if (intervalId) {
      console.log(`[Polling:${instanceId}] Stopping polling`);
      clearInterval(intervalId);
      intervalId = null;
    }
    isPolling.value = false;
  };
  
  onUnmounted(() => {
    stop();
  });
  
  return {
    start,
    stop,
    isPolling: readonly(isPolling),
  };
};

