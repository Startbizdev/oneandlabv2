import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useAudioRecorderState } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceSession, endVoiceSession, sendVoiceTurn } from '../api/ai.service';
import { speakCaryVoice, stopCaryVoice } from '../utils/speak-cary-voice';
import { useVoiceWhisperCapture } from './use-voice-whisper-capture';
import {
  isSpeechMeterLevel,
  shouldAutoSubmitVoiceRecording,
  VOICE_MAX_RECORDING_MS,
  VOICE_NO_SPEECH_TIMEOUT_MS,
} from '../utils/voice-audio-vad';
import {
  appendVoiceTurn,
  createVoiceTurn,
  delay,
  VOICE_STT_TTS_GAP_MS,
  type VoiceTurn,
} from '../utils/voice-session-utils';

export type { VoiceTurn } from '../utils/voice-session-utils';
export type VoicePhase = 'idle' | 'listening' | 'processing' | 'speaking';

export type VoiceSessionOptions = {
  conversationId?: string;
  onConversationSync?: (conversationId: string) => void | Promise<void>;
  onDraftSync?: (draft: AiAppointmentDraft | null) => void | Promise<void>;
  onAppointmentCreated?: (appointmentId: string) => void | Promise<void>;
};

/** STT unique : enregistrement → Whisper serveur (pas de STT natif iOS en parallèle). */
export function useVoiceSession(options: VoiceSessionOptions = {}) {
  const { conversationId, onConversationSync, onDraftSync, onAppointmentCreated } = options;
  const whisper = useVoiceWhisperCapture();
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [active, setActive] = useState(false);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [lastConversationId, setLastConversationId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const activeRef = useRef(false);
  const phaseRef = useRef<VoicePhase>('idle');
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
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    onSyncRef.current = onConversationSync;
  }, [onConversationSync]);
  useEffect(() => {
    onDraftSyncRef.current = onDraftSync;
  }, [onDraftSync]);
  useEffect(() => {
    onAppointmentCreatedRef.current = onAppointmentCreated;
  }, [onAppointmentCreated]);

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

  const startRecording = useCallback(async () => {
    setVoiceError(null);
    const ok = await whisper.start();
    if (!ok) {
      setVoiceError('Microphone indisponible');
      return false;
    }
    recordingStartedAtRef.current = Date.now();
    lastSpeechAtRef.current = null;
    heardSpeechRef.current = false;
    setRecording(true);
    setPhase('listening');
    return true;
  }, [whisper]);

  const submitRecording = useCallback(async () => {
    if (submittingRef.current) return null;
    submittingRef.current = true;
    setVoiceError(null);
    setPhase('processing');
    setRecording(false);

    const audioBase64 = await whisper.stopAndReadBase64();
    if (!audioBase64) {
      setVoiceError('Enregistrement trop court');
      submittingRef.current = false;
      if (activeRef.current) {
        await startRecording();
      } else {
        setPhase('idle');
      }
      return null;
    }

    try {
      const sid = await ensureSession();
      const result = await sendVoiceTurn(sid, '', audioBase64);
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
        await delay(VOICE_STT_TTS_GAP_MS);
        await startRecording();
      } else {
        setPhase('idle');
      }
    }
  }, [ensureSession, speakResponse, startRecording, whisper]);

  submitRecordingRef.current = submitRecording;

  const recorderState = useAudioRecorderState(whisper.recorder, 150);

  useEffect(() => {
    if (!recording || phase !== 'listening' || submittingRef.current) return;

    const now = Date.now();
    const metering = recorderState.metering;

    if (isSpeechMeterLevel(metering)) {
      heardSpeechRef.current = true;
      lastSpeechAtRef.current = now;
    }

    const duration = now - recordingStartedAtRef.current;
    if (!heardSpeechRef.current && duration >= VOICE_NO_SPEECH_TIMEOUT_MS) {
      setVoiceError('Je n’ai rien entendu — réessayez en parlant près du micro.');
      void submitRecordingRef.current();
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
  }, [phase, recording, recorderState.metering, recorderState.durationMillis]);

  const startConversation = useCallback(async () => {
    setActive(true);
    setTurns([]);
    setVoiceError(null);
    setLastConversationId(conversationId ?? null);
    await ensureSession();
    await startRecording();
  }, [conversationId, ensureSession, startRecording]);

  const stopConversation = useCallback(() => {
    setActive(false);
    setRecording(false);
    stopCaryVoice();
    void whisper.discard();
    setPhase('idle');
  }, [whisper]);

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

    if (recording) {
      await submitRecording();
      return;
    }

    await startRecording();
  }, [phase, recording, startRecording, submitRecording]);

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
  const liveTranscript = recording ? 'Parlez… relâchez ou appuyez sur le micro pour envoyer.' : '';

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
    toggleMic,
    submitRecording,
    reset,
  };
}
