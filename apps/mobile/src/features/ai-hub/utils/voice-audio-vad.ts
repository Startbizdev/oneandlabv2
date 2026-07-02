import { VOICE_SILENCE_SUBMIT_MS } from './voice-session-utils';

/** Seuil dB iOS/Android expo-audio (typiquement -160…0). */
export const VOICE_METER_SPEECH_DB = -45;

export const VOICE_MIN_RECORDING_MS = 450;
export const VOICE_MAX_RECORDING_MS = 28_000;
export const VOICE_NO_SPEECH_TIMEOUT_MS = 12_000;

export function isSpeechMeterLevel(metering: number | undefined): boolean {
  if (metering == null || Number.isNaN(metering)) return false;
  return metering > VOICE_METER_SPEECH_DB;
}

export function shouldAutoSubmitVoiceRecording(params: {
  now: number;
  recordingStartedAt: number;
  lastSpeechAt: number | null;
  heardSpeech: boolean;
  silenceMs?: number;
}): boolean {
  const { now, recordingStartedAt, lastSpeechAt, heardSpeech } = params;
  const silenceMs = params.silenceMs ?? VOICE_SILENCE_SUBMIT_MS;
  const duration = now - recordingStartedAt;

  if (duration < VOICE_MIN_RECORDING_MS) return false;

  if (heardSpeech && lastSpeechAt != null && now - lastSpeechAt >= silenceMs) {
    return true;
  }

  if (duration >= VOICE_MAX_RECORDING_MS) {
    return heardSpeech;
  }

  return false;
}
