import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useAudioRecorderState } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceSession, endVoiceSession, sendVoiceTurn } from '../api/ai.service';
import { playCaryVoiceBase64, stopCaryVoice } from '../utils/speak-cary-voice';
import { VOICE_NO_SPEECH_TIMEOUT_MS } from '../utils/voice-audio-vad';
import {
  collectAdaptiveVadSample,
  createAdaptiveVadState,
  isAdaptiveSpeech,
  normalizeVoiceEnergy,
  resetAdaptiveVadState,
  shouldAdaptiveAutoSubmit,
  type AdaptiveVadState,
} from '../utils/voice-adaptive-vad';
import { VOICE_POST_TTS_DELAY_MS, prepareVoiceConversationAudio, prepareVoiceListeningAudio } from '../utils/voice-audio-session';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import {
  appendVoiceTurn,
  createVoiceTurn,
  delay,
  type VoiceTurn,
} from '../utils/voice-session-utils';
import { resetVoiceMeterLogThrottle, voiceLog, voiceLogMeterSample } from '../utils/voice-debug-log';
import { CaryVoiceRealtimeClient, type RealtimeClientPhase } from '../utils/voice-realtime-client';
import { useVoiceAudioCapture } from './use-voice-audio-capture';

export type { VoiceTurn } from '../utils/voice-session-utils';

export type VoicePhase =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'reconnecting'
  | 'fallback'
  | 'error';

export type VoiceTransport = 'none' | 'realtime' | 'rest';

export type VoiceSessionOptions = {
  conversationId?: string;
  userFirstName?: string | null;
  onConversationSync?: (conversationId: string) => void | Promise<void>;
  onDraftSync?: (draft: AiAppointmentDraft | null) => void | Promise<void>;
  onAppointmentCreated?: (appointmentId: string) => void | Promise<void>;
};

function mapRealtimePhase(phase: RealtimeClientPhase): VoicePhase {
  if (phase === 'fallback') return 'fallback';
  if (phase === 'error') return 'error';
  return phase;
}

/** Voix Cary : Realtime xAI en priorité, repli REST (.m4a → STT → LLM → TTS). */
export function useVoiceSession(options: VoiceSessionOptions = {}) {
  const { conversationId, onConversationSync, onDraftSync, onAppointmentCreated } = options;
  const capture = useVoiceAudioCapture();
  const captureRef = useRef(capture);
  captureRef.current = capture;

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transport, setTransport] = useState<VoiceTransport>('none');
  const [active, setActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [lastConversationId, setLastConversationId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceEnergy, setVoiceEnergy] = useState(0);

  const vadStateRef = useRef<AdaptiveVadState>(createAdaptiveVadState());

  const sessionIdRef = useRef<string | null>(null);
  const welcomeRef = useRef<{ text?: string; audio?: string }>({});
  const submittingRef = useRef(false);
  const activeRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const firstSpeechAtRef = useRef<number | null>(null);
  const lastSpeechAtRef = useRef<number | null>(null);
  const heardSpeechRef = useRef(false);
  const meteringUnavailableRef = useRef(false);
  const meteringSampleCountRef = useRef(0);
  const speechLoggedRef = useRef(false);
  const meteringUnavailableLoggedRef = useRef(false);
  const vadCalibratedLoggedRef = useRef(false);
  const submitRecordingRef = useRef<() => Promise<unknown>>(async () => null);
  const realtimeClientRef = useRef<CaryVoiceRealtimeClient | null>(null);
  const restFallbackStartedRef = useRef(false);
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
      void captureRef.current.discard();
      void realtimeClientRef.current?.stop();
    };
  }, []);

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
    await captureRef.current.discard();

    voiceLog('listen.prepare', { postTtsDelayMs: VOICE_POST_TTS_DELAY_MS });
    const ok = await captureRef.current.start();
    if (!ok) {
      voiceLog('listen.denied');
      setVoiceError('Le micro n’a pas pu démarrer. Fermez et rouvrez le mode vocal.');
      return false;
    }

    recordingStartedAtRef.current = Date.now();
    firstSpeechAtRef.current = null;
    lastSpeechAtRef.current = null;
    heardSpeechRef.current = false;
    meteringUnavailableRef.current = false;
    meteringSampleCountRef.current = 0;
    speechLoggedRef.current = false;
    meteringUnavailableLoggedRef.current = false;
    vadCalibratedLoggedRef.current = false;
    resetAdaptiveVadState(vadStateRef.current);
    resetVoiceMeterLogThrottle();
    setVoiceEnergy(0);
    voiceLog('listen.start');
    setRecording(true);
    setPhase('listening');
    return true;
  }, []);

  const submitRecording = useCallback(async () => {
    if (submittingRef.current) return null;
    submittingRef.current = true;
    setVoiceError(null);
    setPhase('processing');
    setRecording(false);
    setVoiceEnergy(0);

    voiceLog('submit.begin', {
      heardSpeech: heardSpeechRef.current,
      meteringSamples: meteringSampleCountRef.current,
      meteringUnavailable: meteringUnavailableRef.current,
    });

    const audioBase64 = await captureRef.current.stopAndReadBase64();
    if (!audioBase64) {
      voiceLog('submit.empty-audio');
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
      const turnStartedAt = Date.now();
      voiceLog('submit.api', { sessionId: sid, audioBase64Len: audioBase64.length });
      const result = await sendVoiceTurn(sid, { audioBase64, sttProvider: 'grok_stt' });
      voiceLog('submit.api.ok', {
        ms: Date.now() - turnStartedAt,
        transcriptLen: result.transcript?.trim().length ?? 0,
        assistantLen: result.assistant_text?.trim().length ?? 0,
        hasAssistantAudio: !!result.assistant_audio_base64?.trim(),
      });
      const userText = result.transcript?.trim() ?? '';
      const assistantText = result.assistant_text?.trim() ?? '';
      if (!userText) {
        voiceLog('submit.empty-transcript');
      }

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
      voiceLog('submit.api.error', { message: getErrorMessage(e, 'Réponse vocale indisponible') });
      setVoiceError(getErrorMessage(e, 'Réponse vocale indisponible'));
      return null;
    } finally {
      submittingRef.current = false;
      if (!activeRef.current) {
        void captureRef.current.discard();
        setPhase('idle');
      } else {
        await startRecording({ clearError: !submitFailed });
      }
    }
  }, [ensureSession, playAudio, startRecording]);

  submitRecordingRef.current = submitRecording;

  const recorderState = useAudioRecorderState(capture.recorder, 100);

  useEffect(() => {
    if (transport !== 'rest' || !recording || phase !== 'listening' || submittingRef.current) return;

    if (recorderState.mediaServicesDidReset) {
      voiceLog('listen.media-reset');
      void startRecording({ clearError: false });
      return;
    }

    const now = Date.now();
    const metering = recorderState.metering;
    const duration = now - recordingStartedAtRef.current;

    voiceLogMeterSample({
      metering: metering ?? null,
      canRecord: recorderState.canRecord,
      isRecording: recorderState.isRecording,
      durationMs: recorderState.durationMillis,
      elapsedMs: duration,
      heardSpeech: heardSpeechRef.current,
      meteringSamples: meteringSampleCountRef.current,
    });

    if (metering != null && !Number.isNaN(metering)) {
      meteringSampleCountRef.current += 1;
      meteringUnavailableRef.current = false;
    } else if (duration >= 1500 && meteringSampleCountRef.current === 0) {
      meteringUnavailableRef.current = true;
      if (!meteringUnavailableLoggedRef.current) {
        meteringUnavailableLoggedRef.current = true;
        voiceLog('vad.metering-unavailable', {
          isRecording: recorderState.isRecording,
          durationMs: recorderState.durationMillis,
        });
      }
    }

    const thresholds = collectAdaptiveVadSample(vadStateRef.current, metering, duration);
    if (thresholds && !vadCalibratedLoggedRef.current) {
      vadCalibratedLoggedRef.current = true;
      voiceLog('vad.calibrated', {
        noiseFloorDb: thresholds.noiseFloorDb,
        speechDb: thresholds.speechDb,
        silenceDb: thresholds.silenceDb,
      });
    }

    if (isAdaptiveSpeech(metering, thresholds)) {
      heardSpeechRef.current = true;
      if (firstSpeechAtRef.current == null) {
        firstSpeechAtRef.current = now;
      }
      lastSpeechAtRef.current = now;
      if (!speechLoggedRef.current) {
        speechLoggedRef.current = true;
        voiceLog('vad.speech', { metering, speechDb: thresholds?.speechDb });
      }
    }

    if (thresholds) {
      setVoiceEnergy(normalizeVoiceEnergy(metering, thresholds));
    }

    if (!heardSpeechRef.current && duration >= VOICE_NO_SPEECH_TIMEOUT_MS) {
      voiceLog('vad.no-speech-timeout', { durationMs: duration });
      void startRecording({ clearError: false });
      return;
    }

    const autoSubmit = shouldAdaptiveAutoSubmit({
      now,
      recordingStartedAt: recordingStartedAtRef.current,
      firstSpeechAt: firstSpeechAtRef.current,
      lastSpeechAt: lastSpeechAtRef.current,
      heardSpeech: heardSpeechRef.current,
      meteringUnavailable: meteringUnavailableRef.current,
      metering,
      thresholds,
    });
    if (autoSubmit) {
      voiceLog('vad.auto-submit', {
        heardSpeech: heardSpeechRef.current,
        silenceMs: lastSpeechAtRef.current != null ? now - lastSpeechAtRef.current : null,
        meteringUnavailable: meteringUnavailableRef.current,
        durationMs: duration,
      });
      void submitRecordingRef.current();
    }
  }, [
    transport,
    phase,
    recording,
    recorderState.metering,
    recorderState.durationMillis,
    recorderState.canRecord,
    recorderState.isRecording,
    recorderState.mediaServicesDidReset,
    startRecording,
  ]);

  const startRestConversation = useCallback(async () => {
    if (restFallbackStartedRef.current) return;
    restFallbackStartedRef.current = true;
    setTransport('rest');
    setPhase('fallback');
    voiceLog('session.fallback.rest');
    try {
      const sid = await ensureSession();
      voiceLog('session.created.rest', {
        sessionId: sid,
        hasWelcomeText: !!welcomeRef.current.text,
        hasWelcomeAudio: !!welcomeRef.current.audio,
      });
    } catch (e) {
      voiceLog('session.error', { message: getErrorMessage(e, 'Impossible d’ouvrir la conversation vocale') });
      setVoiceError(getErrorMessage(e, 'Impossible d’ouvrir la conversation vocale'));
      setActive(false);
      setPhase('error');
      return;
    }
    if (!activeRef.current) return;

    const welcomeText = welcomeRef.current.text;
    const welcomeAudio = welcomeRef.current.audio;
    if (welcomeText) {
      setTurns([createVoiceTurn('assistant', welcomeText)]);
    }
    if (welcomeAudio) {
      voiceLog('tts.welcome.start');
      await playAudio(welcomeAudio);
      voiceLog('tts.welcome.done');
    }
    if (!activeRef.current) return;
    await startRecording();
  }, [ensureSession, playAudio, startRecording]);

  const startRealtimeConversation = useCallback(async () => {
    setPhase('connecting');
    setTransport('realtime');
    voiceLog('session.realtime.start');

    const client = new CaryVoiceRealtimeClient();
    realtimeClientRef.current = client;

    const ok = await client.start(conversationId, {
      onSessionReady: (sessionId, convId) => {
        sessionIdRef.current = sessionId;
        setLastConversationId(convId);
      },
      onPhase: (p) => {
        if (!activeRef.current) return;
        setPhase(mapRealtimePhase(p));
        setRecording(p === 'listening');
      },
      onUserTranscript: (text, interim) => {
        if (interim) return;
        setTurns((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'user' && last.text === text) return prev;
          return appendVoiceTurn(prev, createVoiceTurn('user', text));
        });
      },
      onAssistantTranscript: (text, final) => {
        setTurns((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, text };
            return updated;
          }
          if (!final && text.length < 4) return prev;
          return appendVoiceTurn(prev, createVoiceTurn('assistant', text));
        });
      },
      onDraftSync: async (draft) => {
        if (onDraftSyncRef.current) await onDraftSyncRef.current(draft);
      },
      onConversationSync: async (convId) => {
        setLastConversationId(convId);
        if (onSyncRef.current) await onSyncRef.current(convId);
      },
      onEnergy: (energy) => setVoiceEnergy(energy),
      onError: (message) => setVoiceError(message),
      onFallbackRequired: () => {
        voiceLog('session.realtime.fallback-required');
        void client.stop();
        realtimeClientRef.current = null;
        void startRestConversation();
      },
    });

    if (!ok && activeRef.current) {
      realtimeClientRef.current = null;
      await startRestConversation();
    }
  }, [conversationId, startRestConversation]);

  const startConversation = useCallback(async () => {
    voiceLog('session.open');
    setActive(true);
    setTurns([]);
    setVoiceError(null);
    setLastConversationId(conversationId ?? null);
    restFallbackStartedRef.current = false;
    await prepareVoiceConversationAudio();
    await startRealtimeConversation();
  }, [conversationId, startRealtimeConversation]);

  const interruptAssistant = useCallback(async () => {
    if (transport === 'realtime') {
      await realtimeClientRef.current?.interruptAssistant();
      return;
    }
    stopCaryVoice();
    if (activeRef.current) {
      await startRecording({ clearError: false });
    }
  }, [startRecording, transport]);

  const stopConversation = useCallback(() => {
    voiceLog('session.stop');
    setActive(false);
    setRecording(false);
    setVoiceEnergy(0);
    stopCaryVoice();
    void captureRef.current.discard();
    void realtimeClientRef.current?.stop();
    realtimeClientRef.current = null;
    restFallbackStartedRef.current = false;

    const sid = sessionIdRef.current;
    sessionIdRef.current = null;
    if (sid) void endVoiceSession(sid).catch(() => undefined);
    setTransport('none');
    setPhase('idle');
  }, []);

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

  return {
    phase,
    transport,
    active,
    available: capture.available,
    recognizing: recording,
    voiceEnergy,
    speechError: voiceError,
    lastUserText,
    lastResponse,
    lastConversationId,
    turns,
    processing: phase === 'processing',
    startConversation,
    stopConversation,
    interruptAssistant,
    endSession,
    reset,
  };
}
