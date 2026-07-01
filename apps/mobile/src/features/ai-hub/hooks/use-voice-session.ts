import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { createVoiceSession, sendVoiceTurn } from '../api/ai.service';
import { useDeviceSpeechRecognition } from './use-device-speech-recognition';

export type VoicePhase = 'idle' | 'listening' | 'processing' | 'speaking';

export function useVoiceSession(activeConversationId?: string) {
  const speech = useDeviceSpeechRecognition('fr-FR');
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [active, setActive] = useState(false);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [lastConversationId, setLastConversationId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const wasRecognizingRef = useRef(false);

  const ensureSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const session = await createVoiceSession({
      conversation_id: activeConversationId,
      locale: 'fr',
    });
    sessionIdRef.current = session.id;
    return session.id;
  }, [activeConversationId]);

  const speakResponse = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      Speech.stop();
      Speech.speak(text, {
        language: 'fr-FR',
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    });
  }, []);

  const submitTranscript = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed || submittingRef.current) return null;
      submittingRef.current = true;
      setPhase('processing');
      setLastUserText(trimmed);
      try {
        const sid = await ensureSession();
        const result = await sendVoiceTurn(sid, trimmed);
        setLastResponse(result.assistant_text);
        setLastConversationId(result.conversation_id);
        setPhase('speaking');
        await speakResponse(result.assistant_text);
        return result;
      } finally {
        submittingRef.current = false;
        if (active) {
          setPhase('listening');
          await speech.start();
        } else {
          setPhase('idle');
        }
      }
    },
    [active, ensureSession, speakResponse, speech],
  );

  const startConversation = useCallback(async () => {
    setActive(true);
    setLastResponse(null);
    setLastUserText(null);
    setLastConversationId(null);
    setPhase('listening');
    await ensureSession();
    await speech.start();
  }, [ensureSession, speech]);

  const stopConversation = useCallback(() => {
    setActive(false);
    Speech.stop();
    speech.abort();
    setPhase('idle');
  }, [speech]);

  const toggleMic = useCallback(async () => {
    if (phase === 'processing' || phase === 'speaking') return;
    if (speech.recognizing) {
      speech.stop();
      return;
    }
    setPhase('listening');
    await speech.start();
  }, [phase, speech]);

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

  const reset = useCallback(() => {
    stopConversation();
    sessionIdRef.current = null;
    setLastResponse(null);
    setLastUserText(null);
    setLastConversationId(null);
  }, [stopConversation]);

  return {
    phase,
    active,
    available: speech.available,
    recognizing: speech.recognizing,
    liveTranscript: speech.displayTranscript,
    speechError: speech.error,
    lastUserText,
    lastResponse,
    lastConversationId,
    processing: phase === 'processing',
    startConversation,
    stopConversation,
    toggleMic,
    reset,
  };
}
