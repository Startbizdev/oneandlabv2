import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { createVoiceSession, endVoiceSession, sendVoiceTurn } from '../api/ai.service';
import { useDeviceSpeechRecognition } from './use-device-speech-recognition';
import {
  appendVoiceTurn,
  createVoiceTurn,
  delay,
  shouldAutoSubmitTranscript,
  VOICE_SILENCE_SUBMIT_MS,
  VOICE_STT_TTS_GAP_MS,
  type VoiceTurn,
} from '../utils/voice-session-utils';

export type { VoiceTurn } from '../utils/voice-session-utils';
export type VoicePhase = 'idle' | 'listening' | 'processing' | 'speaking';

export type VoiceSessionOptions = {
  conversationId?: string;
  onConversationSync?: (conversationId: string) => void | Promise<void>;
};

export function useVoiceSession(options: VoiceSessionOptions = {}) {
  const { conversationId, onConversationSync } = options;
  const speech = useDeviceSpeechRecognition({ locale: 'fr-FR', continuous: true });
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [active, setActive] = useState(false);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [lastConversationId, setLastConversationId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const wasRecognizingRef = useRef(false);
  const activeRef = useRef(false);
  const phaseRef = useRef<VoicePhase>('idle');
  const onSyncRef = useRef(onConversationSync);
  const displayTranscriptRef = useRef('');
  const lastResultAtRef = useRef(0);

  useEffect(() => {
    displayTranscriptRef.current = speech.displayTranscript;
    lastResultAtRef.current = speech.lastResultAt;
  }, [speech.displayTranscript, speech.lastResultAt]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    onSyncRef.current = onConversationSync;
  }, [onConversationSync]);

  const ensureSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const session = await createVoiceSession({
      conversation_id: conversationId,
      locale: 'fr',
    });
    sessionIdRef.current = session.id;
    if (session.ai_conversation_id) {
      setLastConversationId(session.ai_conversation_id);
    }
    return session.id;
  }, [conversationId]);

  const speakResponse = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return Promise.resolve();

    return new Promise<void>((resolve) => {
      Speech.stop();
      Speech.speak(trimmed, {
        language: 'fr-FR',
        rate: PlatformRate(),
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    });
  }, []);

  const resumeListening = useCallback(async () => {
    if (!activeRef.current) {
      setPhase('idle');
      return;
    }
    speech.clearTranscript();
    setPhase('listening');
    await speech.start();
  }, [speech]);

  const submitTranscript = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed || submittingRef.current) return null;
      submittingRef.current = true;
      setVoiceError(null);
      setPhase('processing');

      speech.stop();
      speech.abort();
      await delay(VOICE_STT_TTS_GAP_MS);

      const userTurn = createVoiceTurn('user', trimmed);
      setTurns((prev) => appendVoiceTurn(prev, userTurn));

      try {
        const sid = await ensureSession();
        const result = await sendVoiceTurn(sid, trimmed);
        const assistantText = result.assistant_text?.trim() ?? '';
        setLastConversationId(result.conversation_id);
        setTurns((prev) => appendVoiceTurn(prev, createVoiceTurn('assistant', assistantText)));

        if (onSyncRef.current && result.conversation_id) {
          await onSyncRef.current(result.conversation_id);
        }

        if (assistantText) {
          setPhase('speaking');
          await speakResponse(assistantText);
        }
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Réponse vocale indisponible';
        setVoiceError(message);
        return null;
      } finally {
        submittingRef.current = false;
        if (activeRef.current && phaseRef.current !== 'idle') {
          await resumeListening();
        } else {
          setPhase('idle');
        }
      }
    },
    [ensureSession, resumeListening, speakResponse, speech],
  );

  const startConversation = useCallback(async () => {
    setActive(true);
    setTurns([]);
    setVoiceError(null);
    setLastConversationId(conversationId ?? null);
    setPhase('listening');
    await ensureSession();
    speech.clearTranscript();
    await speech.start();
  }, [conversationId, ensureSession, speech]);

  const stopConversation = useCallback(() => {
    setActive(false);
    Speech.stop();
    speech.abort();
    setPhase('idle');
  }, [speech]);

  const endSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      await endVoiceSession(sid);
    } catch {
      /* session déjà clôturée ou réseau */
    }
  }, []);

  const toggleMic = useCallback(async () => {
    if (phase === 'processing' || phase === 'speaking') return;

    if (speech.recognizing) {
      const text = speech.displayTranscript;
      speech.stop();
      if (text.trim()) {
        await submitTranscript(text);
      } else {
        speech.abort();
        setPhase('listening');
      }
      return;
    }

    setPhase('listening');
    await speech.start();
  }, [phase, speech, submitTranscript]);

  /** Fin naturelle STT (non continu ponctuel) */
  useEffect(() => {
    const was = wasRecognizingRef.current;
    wasRecognizingRef.current = speech.recognizing;
    if (!was || speech.recognizing) return;
    if (!active || phase !== 'listening') return;
    const text = speech.transcript.trim();
    if (text) {
      void submitTranscript(text);
    }
  }, [active, phase, speech.recognizing, speech.transcript, submitTranscript]);

  /** Détection silence — envoi auto type ChatGPT */
  useEffect(() => {
    if (!active || phase !== 'listening' || !speech.recognizing) return;
    const text = speech.displayTranscript;
    if (!text.trim() || speech.lastResultAt <= 0) return;

    const timer = setTimeout(() => {
      if (!activeRef.current || phaseRef.current !== 'listening') return;
      if (
        shouldAutoSubmitTranscript(
          displayTranscriptRef.current,
          lastResultAtRef.current,
          Date.now(),
          VOICE_SILENCE_SUBMIT_MS,
        )
      ) {
        void submitTranscript(displayTranscriptRef.current);
      }
    }, VOICE_SILENCE_SUBMIT_MS);

    return () => clearTimeout(timer);
  }, [
    active,
    phase,
    speech.displayTranscript,
    speech.lastResultAt,
    speech.recognizing,
    submitTranscript,
  ]);

  const reset = useCallback(
    (opts?: { keepConversationId?: boolean }) => {
      stopConversation();
      sessionIdRef.current = null;
      setTurns([]);
      setVoiceError(null);
      if (!opts?.keepConversationId) {
        setLastConversationId(null);
      }
    },
    [stopConversation],
  );

  const liveTranscript = speech.displayTranscript;
  const lastUserText = [...turns].reverse().find((t) => t.role === 'user')?.text ?? null;
  const lastResponse = [...turns].reverse().find((t) => t.role === 'assistant')?.text ?? null;
  const speechError = voiceError ?? speech.error;

  return {
    phase,
    active,
    available: speech.available,
    recognizing: speech.recognizing,
    liveTranscript,
    speechError,
    lastUserText,
    lastResponse,
    lastConversationId,
    turns,
    processing: phase === 'processing',
    startConversation,
    stopConversation,
    endSession,
    toggleMic,
    reset,
  };
}

function PlatformRate(): number {
  return 0.95;
}
