import { isDevBuild } from '@/config/env';

export function voiceLog(event: string, detail?: Record<string, unknown>): void {
  if (!isDevBuild()) return;
  if (detail != null) {
    console.warn(`[voice] ${event}`, detail);
  } else {
    console.warn(`[voice] ${event}`);
  }
}

let meterLogAt = 0;

export function resetVoiceMeterLogThrottle(): void {
  meterLogAt = 0;
}

/** Échantillon metering ~1/s pendant l’écoute (évite le spam Metro). */
export function voiceLogMeterSample(sample: Record<string, unknown>): void {
  if (!isDevBuild()) return;
  const now = Date.now();
  if (now - meterLogAt < 1000) return;
  meterLogAt = now;
  console.warn('[voice] meter', sample);
}
