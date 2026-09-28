/**
 * Composable pour le polling des notifications
 */

import { unref, type Ref } from 'vue';

export type PollingInterval = number | Ref<number> | (() => number);

function resolvePollingIntervalMs(interval: PollingInterval): number {
  const raw = typeof interval === 'function' ? interval() : unref(interval);
  return Number.isFinite(raw) && raw > 0 ? raw : 30_000;
}

export type UsePollingOptions = {
  /** Si true, le tick est ignoré (ex. création RDV : évite la contention avec le backend). */
  shouldSkip?: () => boolean;
  /** Pause quand l'onglet est caché (défaut true). */
  pauseWhenHidden?: boolean;
};

export const usePolling = (
  callback: () => Promise<void>,
  interval: PollingInterval = 30000,
  options?: UsePollingOptions,
) => {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const isPolling = ref(false);
  const instanceId = Math.random().toString(36).substring(7);
  const pauseWhenHidden = options?.pauseWhenHidden !== false;
  const resolveInterval = () => resolvePollingIntervalMs(interval);

  const tick = () => {
    if (options?.shouldSkip?.()) {
      return Promise.resolve();
    }
    if (pauseWhenHidden && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return Promise.resolve();
    }
    return callback();
  };

  const onVisibility = () => {
    if (!pauseWhenHidden || typeof document === 'undefined') return;
    if (document.visibilityState === 'visible' && intervalId !== null) {
      tick().catch((err) => {
        console.error(`[Polling:${instanceId}] Error in callback:`, err);
      });
    }
  };

  const start = () => {
    if (intervalId !== null) {
      console.log(`[Polling:${instanceId}] Already polling, skipping start`);
      return;
    }

    const ms = resolveInterval();
    console.log(`[Polling:${instanceId}] Starting polling (interval: ${ms}ms)`);
    isPolling.value = true;

    tick().catch((err) => {
      console.error(`[Polling:${instanceId}] Error in callback:`, err);
    });

    intervalId = setInterval(() => {
      tick().catch((err) => {
        console.error(`[Polling:${instanceId}] Error in callback:`, err);
      });
    }, ms);

    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
  };

  const stop = () => {
    if (intervalId) {
      console.log(`[Polling:${instanceId}] Stopping polling`);
      clearInterval(intervalId);
      intervalId = null;
    }
    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
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
