import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useAudioRecorderState } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceSession, endVoiceSession, sendVoiceTurn } from '../api/ai.service';
import { playCaryVoiceBase64, stopCaryVoice } from '../utils/speak-cary-voice';
import {
  isSpeechMeterLevel,
  shouldAutoSubmitVoiceRecording,
  VOICE_NO_SPEECH_TIMEOUT_MS,
} from '../utils/voice-audio-vad';
import { VOICE_POST_TTS_DELAY_MS, prepareVoiceListeningAudio } from '../utils/voice-audio-session';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import {
  appendVoiceTurn,
  createVoiceTurn,
  delay,
  type VoiceTurn,
} from '../utils/voice-session-utils';
import { useVoiceAudioCapture } from './use-voice-audio-capture';

export type { VoiceTurn } from '../utils/voice-session-utils';
export type VoicePhase = 'idle' | 'listening' | 'processing' | 'speaking';

export type VoiceSessionOptions = {
  conversationId?: string;
  userFirstName?: string | null;
  onConversationSync?: (conversationId: string) => void | Promise<void>;
  onDraftSync?: (draft: AiAppointmentDraft | null) => void | Promise<void>;
  onAppointmentCreated?: (appointmentId: string) => void | Promise<void>;
};

/** Micro → Grok STT + Grok LLM + Grok TTS (xAI) — pas de STT/TTS natif iOS. */
export function useVoiceSession(options: VoiceSessionOptions = {}) {
  const { conversationId, onConversationSync, onDraftSync, onAppointmentCreated } = options;
  const capture = useVoiceAudioCapture();

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [active, setActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [lastConversationId, setLastConversationId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [liveHint, setLiveHint] = useState('');

  const sessionIdRef = useRef<string | null>(null);
  const welcomeRef = useRef<{ text?: string; audio?: string }>({});
  const submittingRef = useRef(false);
  const activeRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const lastSpeechAtRef = useRef<number | null>(null);
  const heardSpeechRef = useRef(false);
  const submitRecordingRef = useRef<() => Promise<unknown>>(async () => null);
  const onSyncRef = useRef(onConversationSync);
  const onDraftSyncRef = useRef(onDraftSync);
  const onAppointmentCreatedRef = useRef(onAppointmentCreated);

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
    return () => {
      stopCaryVoice();
      void capture.discard();
    };
  }, [capture]);

  const playAudio = useCallback(async (audioBase64?: string | null) => {
    if (!audioBase64?.trim()) return;
    setPhase('speaking');
    await playCaryVoiceBase64(audioBase64);
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const session = await createVoiceSession({
      conversation_id: conversationId,
      locale: 'fr',
    });
    sessionIdRef.current = session.id;
    welcomeRef.current = {
      text: session.welcome_text,
      audio: session.welcome_audio_base64,
    };
    if (session.ai_conversation_id) {
      setLastConversationId(session.ai_conversation_id);
    }
    return session.id;
  }, [conversationId]);

  const startRecording = useCallback(async (opts?: { clearError?: boolean }) => {
    if (opts?.clearError !== false) {
      setVoiceError(null);
    }
    stopCaryVoice();
    await delay(VOICE_POST_TTS_DELAY_MS);
    await prepareVoiceListeningAudio();
    void capture.discard();

    const ok = await capture.start();
    if (!ok) {
      setVoiceError('Autorisez le micro dans les réglages pour parler à Cary.');
      return false;
    }

    recordingStartedAtRef.current = Date.now();
    lastSpeechAtRef.current = null;
    heardSpeechRef.current = false;
    setLiveHint('Parlez… vos mots apparaîtront après la pause.');
    setRecording(true);
    setPhase('listening');
    return true;
  }, [capture]);

  const submitRecording = useCallback(async () => {
    if (submittingRef.current) return null;
    submittingRef.current = true;
    setVoiceError(null);
    setPhase('processing');
    setRecording(false);
    setLiveHint('');

    const audioBase64 = await capture.stopAndReadBase64();
    if (!audioBase64) {
      submittingRef.current = false;
      if (activeRef.current) {
        await startRecording({ clearError: false });
      } else {
        setPhase('idle');
      }
      return null;
    }

    let submitFailed = false;
    try {
      const sid = await ensureSession();
      const result = await sendVoiceTurn(sid, audioBase64);
      const userText = result.transcript?.trim() ?? '';
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

      if (result.assistant_audio_base64) {
        await playAudio(result.assistant_audio_base64);
      }
      return result;
    } catch (e) {
      submitFailed = true;
      setVoiceError(getErrorMessage(e, 'Réponse vocale indisponible'));
      return null;
    } finally {
      submittingRef.current = false;
      if (!activeRef.current) {
        void capture.discard();
        setPhase('idle');
      } else {
        await startRecording({ clearError: !submitFailed });
      }
    }
  }, [capture, ensureSession, playAudio, startRecording]);

  submitRecordingRef.current = submitRecording;

  const recorderState = useAudioRecorderState(capture.recorder, 150);

  useEffect(() => {
    if (!recording || phase !== 'listening' || submittingRef.current) return;

    const now = Date.now();
    const metering = recorderState.metering;

    if (isSpeechMeterLevel(metering)) {
      heardSpeechRef.current = true;
      lastSpeechAtRef.current = now;
      setLiveHint('Je vous entends… relâchez pour envoyer.');
    }

    const duration = now - recordingStartedAtRef.current;
    if (!heardSpeechRef.current && duration >= VOICE_NO_SPEECH_TIMEOUT_MS) {
      void startRecording();
      return;
    }

    if (
      shouldAutoSubmitVoiceRecording({
        now,
        recordingStartedAt: recordingStartedAtRef.current,
        lastSpeechAt: lastSpeechAtRef.current,
        heardSpeech: heardSpeechRef.current,
      })
    ) {
      void submitRecordingRef.current();
    }
  }, [phase, recording, recorderState.metering, recorderState.durationMillis, startRecording]);

  const startConversation = useCallback(async () => {
    setActive(true);
    setTurns([]);
    setVoiceError(null);
    setLastConversationId(conversationId ?? null);
    setPhase('processing');
    try {
      await ensureSession();
    } catch (e) {
      setVoiceError(getErrorMessage(e, 'Impossible d’ouvrir la conversation vocale'));
      setActive(false);
      setPhase('idle');
      return;
    }
    if (!activeRef.current) return;

    const welcomeText = welcomeRef.current.text;
    const welcomeAudio = welcomeRef.current.audio;
    if (welcomeText) {
      setTurns([createVoiceTurn('assistant', welcomeText)]);
    }
    if (welcomeAudio) {
      await playAudio(welcomeAudio);
    }
    if (!activeRef.current) return;
    await startRecording();
  }, [conversationId, ensureSession, playAudio, startRecording]);

  const stopConversation = useCallback(() => {
    setActive(false);
    setRecording(false);
    setLiveHint('');
    stopCaryVoice();
    void capture.discard();
    setPhase('idle');
  }, [capture]);

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
      welcomeRef.current = {};
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
  const liveTranscript = phase === 'listening' ? liveHint : '';

  return {
    phase,
    active,
    available: true,
    recognizing: recording,
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
