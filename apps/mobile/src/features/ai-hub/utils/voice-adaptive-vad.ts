import {
  VOICE_METER_SILENCE_DB,
  VOICE_METER_SPEECH_DB,
  VOICE_MIN_RECORDING_MS,
  VOICE_MIN_SPEECH_MS,
  VOICE_MAX_RECORDING_MS,
  VOICE_FALLBACK_SUBMIT_MS,
} from './voice-audio-vad';
import { VOICE_SILENCE_SUBMIT_MS } from './voice-session-utils';

/** Calibration bruit ambiant au début de chaque écoute (~8 échantillons à 100 ms). */
export const VOICE_VAD_CALIBRATION_MS = 600;
export const VOICE_VAD_SPEECH_MARGIN_DB = 9;
export const VOICE_VAD_SILENCE_MARGIN_DB = 3;

export type AdaptiveVadThresholds = {
  noiseFloorDb: number;
  speechDb: number;
  silenceDb: number;
};

export type AdaptiveVadState = {
  samples: number[];
  thresholds: AdaptiveVadThresholds | null;
};

export function createAdaptiveVadState(): AdaptiveVadState {
  return { samples: [], thresholds: null };
}

export function resetAdaptiveVadState(state: AdaptiveVadState): void {
  state.samples = [];
  state.thresholds = null;
}

function median(values: number[]): number {
  if (values.length === 0) return VOICE_METER_SILENCE_DB;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function collectAdaptiveVadSample(
  state: AdaptiveVadState,
  metering: number | undefined,
  elapsedMs: number,
): AdaptiveVadThresholds | null {
  if (state.thresholds) return state.thresholds;
  if (metering != null && !Number.isNaN(metering)) {
    state.samples.push(metering);
  }
  if (elapsedMs < VOICE_VAD_CALIBRATION_MS) return null;

  const noiseFloorDb = median(state.samples);
  const speechDb = Math.min(
    Math.max(noiseFloorDb + VOICE_VAD_SPEECH_MARGIN_DB, VOICE_METER_SPEECH_DB),
    -22,
  );
  const silenceDb = Math.min(
    Math.max(noiseFloorDb + VOICE_VAD_SILENCE_MARGIN_DB, VOICE_METER_SILENCE_DB),
    speechDb - 2,
  );

  state.thresholds = { noiseFloorDb, speechDb, silenceDb };
  return state.thresholds;
}

export function isAdaptiveSpeech(
  metering: number | undefined,
  thresholds: AdaptiveVadThresholds | null,
): boolean {
  if (metering == null || Number.isNaN(metering)) return false;
  const speechDb = thresholds?.speechDb ?? VOICE_METER_SPEECH_DB;
  return metering > speechDb;
}

export function normalizeVoiceEnergy(
  metering: number | undefined,
  thresholds: AdaptiveVadThresholds | null,
): number {
  if (metering == null || Number.isNaN(metering) || !thresholds) return 0;
  const span = thresholds.speechDb - thresholds.noiseFloorDb;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (metering - thresholds.noiseFloorDb) / span));
}

export function shouldAdaptiveAutoSubmit(params: {
  now: number;
  recordingStartedAt: number;
  lastSpeechAt: number | null;
  firstSpeechAt?: number | null;
  heardSpeech: boolean;
  metering?: number | null;
  meteringUnavailable?: boolean;
  thresholds: AdaptiveVadThresholds | null;
  silenceMs?: number;
}): boolean {
  const { now, recordingStartedAt, lastSpeechAt, heardSpeech } = params;
  const silenceMs = params.silenceMs ?? VOICE_SILENCE_SUBMIT_MS;
  const duration = now - recordingStartedAt;

  if (duration < VOICE_MIN_RECORDING_MS) return false;
  if (!params.thresholds && duration < VOICE_VAD_CALIBRATION_MS) return false;

  if (heardSpeech && lastSpeechAt != null && now - lastSpeechAt >= silenceMs) {
    const firstSpeechAt = params.firstSpeechAt ?? lastSpeechAt;
    if (now - firstSpeechAt < VOICE_MIN_SPEECH_MS) {
      return false;
    }
    if (isAdaptiveSpeech(params.metering ?? undefined, params.thresholds)) {
      return false;
    }
    return true;
  }

  if (params.meteringUnavailable && duration >= VOICE_FALLBACK_SUBMIT_MS) {
    return true;
  }

  if (duration >= VOICE_MAX_RECORDING_MS) {
    return heardSpeech || !!params.meteringUnavailable;
  }

  return false;
}
