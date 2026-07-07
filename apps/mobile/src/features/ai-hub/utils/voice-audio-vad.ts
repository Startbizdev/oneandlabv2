import { VOICE_SILENCE_SUBMIT_MS } from './voice-session-utils';

/** Seuils fallback si calibration indisponible. */
export const VOICE_METER_SPEECH_DB = -32;
export const VOICE_METER_SILENCE_DB = -38;

/** Durée min d’écoute avant tout envoi auto (évite les clics / bruits courts). */
export const VOICE_MIN_RECORDING_MS = 900;
/** Durée min de parole détectée avant fin de tour (laisse reprendre après une pause). */
export const VOICE_MIN_SPEECH_MS = 650;
/** Durée max d’un tour vocal (évite les enregistrements interminables). */
export const VOICE_MAX_RECORDING_MS = 12_000;
export const VOICE_NO_SPEECH_TIMEOUT_MS = 8_000;
export const VOICE_FALLBACK_SUBMIT_MS = 4500;

export function isSpeechMeterLevel(metering: number | undefined): boolean {
  if (metering == null || Number.isNaN(metering)) return false;
  return metering > VOICE_METER_SPEECH_DB;
}

export function isSilenceMeterLevel(metering: number | undefined): boolean {
  if (metering == null || Number.isNaN(metering)) return true;
  return metering <= VOICE_METER_SILENCE_DB;
}

export function shouldAutoSubmitVoiceRecording(params: {
  now: number;
  recordingStartedAt: number;
  lastSpeechAt: number | null;
  heardSpeech: boolean;
  silenceMs?: number;
  meteringUnavailable?: boolean;
  metering?: number | null;
}): boolean {
  const { now, recordingStartedAt, lastSpeechAt, heardSpeech } = params;
  const silenceMs = params.silenceMs ?? VOICE_SILENCE_SUBMIT_MS;
  const duration = now - recordingStartedAt;

  if (duration < VOICE_MIN_RECORDING_MS) return false;

  if (heardSpeech && lastSpeechAt != null && now - lastSpeechAt >= silenceMs) {
    if (params.metering != null && isSpeechMeterLevel(params.metering)) {
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
