import { isDevBuild } from '@/config/env';

const SLOW_MS = 500;

export function logApiTiming(path: string, startedAt: number, ok: boolean): void {
  if (!isDevBuild()) return;
  const ms = Date.now() - startedAt;
  if (ms >= SLOW_MS) {
    console.warn(`[api] ${ms}ms ${ok ? 'OK' : 'ERR'} ${path}`);
  }
}
