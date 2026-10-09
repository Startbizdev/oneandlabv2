export type VoiceTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
};

/** Délai après la fin de phrase détectée avant envoi auto (VAD). */
export const VOICE_SILENCE_SUBMIT_MS = 1600;

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

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
