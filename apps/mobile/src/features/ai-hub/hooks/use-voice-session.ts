import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceSession, endVoiceSession, sendVoiceTurn } from '../api/ai.service';
import { speakCaryVoice, stopCaryVoice } from '../utils/speak-cary-voice';
import { VOICE_NO_SPEECH_TIMEOUT_MS } from '../utils/voice-audio-vad';
import {
  appendVoiceTurn,
  buildVoiceWelcomeMessage,
  createVoiceTurn,
  delay,
  shouldAutoSubmitTranscript,
  VOICE_STT_TTS_GAP_MS,
  type VoiceTurn,
} from '../utils/voice-session-utils';
import { useDeviceSpeechRecognition } from './use-device-speech-recognition';

export type { VoiceTurn } from '../utils/voice-session-utils';
export type VoicePhase = 'idle' | 'listening' | 'processing' | 'speaking';

export type VoiceSessionOptions = {
  conversationId?: string;
  userFirstName?: string | null;
  onConversationSync?: (conversationId: string) => void | Promise<void>;
  onDraftSync?: (draft: AiAppointmentDraft | null) => void | Promise<void>;
  onAppointmentCreated?: (appointmentId: string) => void | Promise<void>;
};

/** STT natif (iOS/Android) → transcript texte → Grok serveur — expérience mains libres type voice chat. */
export function useVoiceSession(options: VoiceSessionOptions = {}) {
  const { conversationId, userFirstName, onConversationSync, onDraftSync, onAppointmentCreated } =
    options;
  const device = useDeviceSpeechRecognition({ locale: 'fr-FR', continuous: true });

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [active, setActive] = useState(false);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [lastConversationId, setLastConversationId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const activeRef = useRef(false);
  const listeningStartedAtRef = useRef(0);
  const submitRecordingRef = useRef<() => Promise<unknown>>(async () => null);
  const onSyncRef = useRef(onConversationSync);
  const onDraftSyncRef = useRef(onDraftSync);
  const onAppointmentCreatedRef = useRef(onAppointmentCreated);
  const deviceRef = useRef(device);

  deviceRef.current = device;

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    onSyncRef.current = onConversationSync;
  }, [onConversationSync]);
  useEffect(() => {
    onDraftSyncRef.current = onDraftSync;
  }, [onDraftSync]);
  useEffect(() => {
    onAppointmentCreatedRef.current = onAppointmentCreated;
  }, [onAppointmentCreated]);

  useEffect(() => {
    if (device.error && active) {
      setVoiceError(device.error);
    }
  }, [active, device.error]);

  useEffect(() => {
    return () => {
      stopCaryVoice();
      deviceRef.current.abort();
    };
  }, []);

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

  const speakResponse = useCallback(async (text: string) => {
    await speakCaryVoice(text);
  }, []);

  const startListening = useCallback(
    async (opts?: { clearError?: boolean }) => {
      if (opts?.clearError !== false) {
        setVoiceError(null);
      }
      device.clearTranscript();
      const ok = await device.start();
      if (!ok) {
        setVoiceError(device.error ?? 'Microphone ou reconnaissance vocale indisponible');
        return false;
      }
      listeningStartedAtRef.current = Date.now();
      setPhase('listening');
      return true;
    },
    [device],
  );

  const playWelcome = useCallback(async () => {
    const welcomeText = buildVoiceWelcomeMessage(userFirstName);
    setTurns([createVoiceTurn('assistant', welcomeText)]);
    setPhase('speaking');
    await speakResponse(welcomeText);
  }, [speakResponse, userFirstName]);

  const submitRecording = useCallback(async () => {
    if (submittingRef.current) return null;
    submittingRef.current = true;
    setVoiceError(null);
    setPhase('processing');

    const captured = device.displayTranscript.trim();
    device.stop();

    if (!captured) {
      submittingRef.current = false;
      device.clearTranscript();
      if (activeRef.current) {
        await startListening();
      } else {
        setPhase('idle');
      }
      return null;
    }

    device.clearTranscript();

    let submitFailed = false;
    try {
      const sid = await ensureSession();
      const result = await sendVoiceTurn(sid, captured);
      const userText = result.transcript?.trim() ?? captured;
      const assistantText = result.assistant_text?.trim() ?? '';

      if (userText) {
        setTurns((prev) => appendVoiceTurn(prev, createVoiceTurn('user', userText)));
      }
      setLastConversationId(result.conversation_id);
      if (assistantText) {
        setTurns((prev) => appendVoiceTurn(prev, createVoiceTurn('assistant', assistantText)));
      }

      if (onSyncRef.current && result.conversation_id) {
        await onSyncRef.current(result.conversation_id);
      }
      if (onDraftSyncRef.current && result.draft) {
        await onDraftSyncRef.current(result.draft);
      }
      const appointmentId = result.appointment_id;
      if (appointmentId && onAppointmentCreatedRef.current) {
        await onAppointmentCreatedRef.current(appointmentId);
      }

      if (assistantText) {
        setPhase('speaking');
        await speakResponse(assistantText);
      }
      return result;
    } catch (e) {
      submitFailed = true;
      const message = e instanceof Error ? e.message : 'Réponse vocale indisponible';
      setVoiceError(message);
      return null;
    } finally {
      submittingRef.current = false;
      if (!activeRef.current) {
        device.abort();
        setPhase('idle');
      } else if (!submitFailed) {
        await delay(VOICE_STT_TTS_GAP_MS);
        await startListening();
      } else {
        await delay(VOICE_STT_TTS_GAP_MS);
        await startListening({ clearError: false });
      }
    }
  }, [device, ensureSession, speakResponse, startListening]);

  submitRecordingRef.current = submitRecording;

  useEffect(() => {
    if (!active || phase !== 'listening' || submittingRef.current) return;

    const now = Date.now();
    const text = device.displayTranscript.trim();
    const listeningDuration = now - listeningStartedAtRef.current;

    if (!text && listeningDuration >= VOICE_NO_SPEECH_TIMEOUT_MS) {
      device.abort();
      device.clearTranscript();
      void startListening();
      return;
    }

    if (
      text &&
      device.lastResultAt > 0 &&
      shouldAutoSubmitTranscript(text, device.lastResultAt, now)
    ) {
      void submitRecordingRef.current();
    }
  }, [active, phase, device.displayTranscript, device.lastResultAt, startListening]);

  const startConversation = useCallback(async () => {
    if (!device.available) {
      setVoiceError(
        device.error ?? 'Reconnaissance vocale indisponible — utilisez l’app Cary (pas Expo Go).',
      );
      return;
    }
    setActive(true);
    setTurns([]);
    setVoiceError(null);
    setLastConversationId(conversationId ?? null);
    setPhase('processing');
    await ensureSession();
    if (!activeRef.current) return;
    await playWelcome();
    if (!activeRef.current) return;
    await delay(VOICE_STT_TTS_GAP_MS);
    await startListening();
  }, [
    conversationId,
    device.available,
    device.error,
    ensureSession,
    playWelcome,
    startListening,
  ]);

  const stopConversation = useCallback(() => {
    setActive(false);
    stopCaryVoice();
    device.abort();
    device.clearTranscript();
    setPhase('idle');
  }, [device]);

  const endSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      await endVoiceSession(sid);
    } catch {
      /* session déjà clôturée ou réseau */
    }
  }, []);

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

  const lastUserText = [...turns].reverse().find((t) => t.role === 'user')?.text ?? null;
  const lastResponse = [...turns].reverse().find((t) => t.role === 'assistant')?.text ?? null;
  const liveTranscript = phase === 'listening' ? device.displayTranscript : '';

  return {
    phase,
    active,
    available: device.available,
    recognizing: device.recognizing,
    liveTranscript,
    speechError: voiceError,
    lastUserText,
    lastResponse,
    lastConversationId,
    turns,
    processing: phase === 'processing',
    startConversation,
    stopConversation,
    endSession,
    reset,
  };
}
