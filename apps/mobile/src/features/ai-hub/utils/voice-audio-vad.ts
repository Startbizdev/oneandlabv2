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
