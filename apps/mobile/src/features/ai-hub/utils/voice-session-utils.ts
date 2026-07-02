export type VoiceTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
};

/** Délai après le dernier résultat STT avant envoi auto (fin de phrase). */
export const VOICE_SILENCE_SUBMIT_MS = 1200;

/** Pause audio entre fin STT et TTS (évite conflit session iOS). */
export const VOICE_STT_TTS_GAP_MS = 180;

export function createVoiceTurn(role: VoiceTurn['role'], text: string): VoiceTurn {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    at: Date.now(),
  };
}

export function appendVoiceTurn(turns: VoiceTurn[], turn: VoiceTurn): VoiceTurn[] {
  return [...turns, turn];
}

export function shouldAutoSubmitTranscript(
  transcript: string,
  lastSpeechAt: number,
  now: number,
  silenceMs = VOICE_SILENCE_SUBMIT_MS,
): boolean {
  const trimmed = transcript.trim();
  if (!trimmed) return false;
  return now - lastSpeechAt >= silenceMs;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
