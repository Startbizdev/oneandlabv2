import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';

// Minimal Nuxt auto-import stubs for the composable under test
vi.stubGlobal('ref', (v: unknown) => ({ value: v }));
vi.stubGlobal('readonly', (v: unknown) => v);
vi.stubGlobal('onUnmounted', (fn: () => void) => {
  (globalThis as { __unmount?: () => void }).__unmount = fn;
});

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('calls callback immediately and on interval', async () => {
    const { usePolling } = await import('../../composables/usePolling');
    const cb = vi.fn().mockResolvedValue(undefined);
    const { start, stop } = usePolling(cb, 1000);
    start();
    expect(cb).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(cb).toHaveBeenCalledTimes(2);
    stop();
  });

  it('skips tick when shouldSkip returns true', async () => {
    const { usePolling } = await import('../../composables/usePolling');
    const cb = vi.fn().mockResolvedValue(undefined);
    const { start, stop } = usePolling(cb, 1000, { shouldSkip: () => true });
    start();
    expect(cb).toHaveBeenCalledTimes(0);
    stop();
  });

  it('accepts a dynamic interval resolver', async () => {
    const { usePolling } = await import('../../composables/usePolling');
    const cb = vi.fn().mockResolvedValue(undefined);
    const { start, stop } = usePolling(cb, () => 500);
    start();
    expect(cb).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(cb).toHaveBeenCalledTimes(2);
    stop();
  });
});
