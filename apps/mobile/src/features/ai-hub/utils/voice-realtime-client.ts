import type {
  AiAppointmentDraft,
  AiEmergency,
  VoiceRealtimeSessionConfig,
  VoiceRealtimeStartResponse,
} from '@oneandlab/shared-types';
import {
  executeVoiceRealtimeTool,
  startVoiceRealtimeSession,
  syncVoiceRealtimeEvent,
} from '../api/ai.service';
import {
  extractAssistantTranscriptDelta,
  extractAssistantTranscriptFinal,
  extractFunctionCallDone,
  extractUserTranscript,
  extractXaiConversationId,
  isResponseCreated,
  isResponseDone,
  isSpeechStarted,
  parseRealtimeJsonMessage,
} from './voice-realtime-events';
import { voiceLog } from './voice-debug-log';
import { delay } from './voice-session-utils';

/** Au-delà, la voix bascule sur le transport REST (socket fermée, plus aucun rappel). */
const REALTIME_CONNECT_TIMEOUT_MS = 12_000;

export type RealtimeClientPhase =
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'reconnecting'
  | 'fallback'
  | 'error';

export type RealtimeClientHandlers = {
  onSessionReady?: (sessionId: string, conversationId: string) => void;
  onPhase?: (phase: RealtimeClientPhase) => void;
  onUserTranscript?: (text: string, interim: boolean) => void;
  onAssistantTranscript?: (text: string, final: boolean) => void;
  onDraftSync?: (draft: AiAppointmentDraft | null) => void;
  onConversationSync?: (conversationId: string) => void;
  /** Signe d'urgence détecté par le serveur dans la transcription finale de l'utilisateur. */
  onEmergency?: (emergency: AiEmergency) => void;
  onEnergy?: (energy: number) => void;
  onError?: (message: string) => void;
  onFallbackRequired?: () => void;
};

type PendingFunctionCall = {
  callId: string;
  name: string;
  arguments: string;
};

let PipelineModule: typeof import('@edkimmel/expo-audio-stream') | null = null;
let ExpoPlayAudioStreamModule: typeof import('@edkimmel/expo-audio-stream').ExpoPlayAudioStream | null = null;

async function loadAudioStreamModules(): Promise<boolean> {
  if (PipelineModule && ExpoPlayAudioStreamModule) return true;
  try {
    const mod = await import('@edkimmel/expo-audio-stream');
    PipelineModule = mod;
    ExpoPlayAudioStreamModule = mod.ExpoPlayAudioStream;
    return true;
  } catch (e) {
    voiceLog('realtime.audio-module-missing', { message: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Arguments JSON d'un appel d'outil du modèle ; illisibles : objet vide (le serveur valide). */
function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed));
    }
    voiceLog('realtime.tool.args-not-object');
  } catch (e) {
    voiceLog('realtime.tool.args-invalid', { message: errorMessage(e) });
  }
  return {};
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function pcmFloat32ToPcm16Bytes(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    bytes[i * 2] = int16 & 0xff;
    bytes[i * 2 + 1] = (int16 >> 8) & 0xff;
  }
  return bytes;
}

function audioEventToBytes(data: string | Float32Array): Uint8Array {
  if (typeof data === 'string') return base64ToUint8Array(data);
  return pcmFloat32ToPcm16Bytes(data);
}

function pcm16Base64ToEnergy(data: string | Float32Array): number {
  try {
    const bytes = audioEventToBytes(data);
    if (bytes.length < 4) return 0;
    let sum = 0;
    const samples = Math.floor(bytes.length / 2);
    for (let i = 0; i < samples; i += 1) {
      const lo = bytes[i * 2] ?? 0;
      const hi = bytes[i * 2 + 1] ?? 0;
      let sample = lo | (hi << 8);
      if (sample >= 0x8000) sample -= 0x10000;
      sum += Math.abs(sample);
    }
    const avg = sum / Math.max(1, samples);
    return Math.min(1, avg / 8000);
  } catch {
    return 0;
  }
}

export class CaryVoiceRealtimeClient {
  private ws: WebSocket | null = null;
  private session: VoiceRealtimeStartResponse | null = null;
  private handlers: RealtimeClientHandlers = {};
  private active = false;
  private turnId = 0;
  private micSubscription: { remove?: () => void } | null = null;
  private assistantBuffer = '';
  private pendingFunctionCalls: PendingFunctionCall[] = [];
  private xaiConversationId: string | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private conversationId?: string;
  private locale = 'fr';

  async start(conversationId: string | undefined, handlers: RealtimeClientHandlers): Promise<boolean> {
    this.handlers = handlers;
    this.conversationId = conversationId;
    this.active = true;
    this.handlers.onPhase?.('connecting');

    const audioOk = await loadAudioStreamModules();
    if (!audioOk) {
      this.handlers.onFallbackRequired?.();
      return false;
    }

    try {
      this.session = await startVoiceRealtimeSession({
        conversation_id: conversationId,
        locale: this.locale,
      });
    } catch (e) {
      voiceLog('realtime.start.failed', { message: e instanceof Error ? e.message : String(e) });
      this.handlers.onFallbackRequired?.();
      return false;
    }

    this.handlers.onSessionReady?.(this.session.session_id, this.session.conversation_id);

    if (this.session.draft && this.handlers.onDraftSync) {
      await this.handlers.onDraftSync(this.session.draft);
    }
    if (this.session.conversation_id && this.handlers.onConversationSync) {
      await this.handlers.onConversationSync(this.session.conversation_id);
    }

    const welcome = this.session.welcome_text?.trim();
    if (welcome) {
      this.handlers.onAssistantTranscript?.(welcome, true);
    }

    return this.connectWebSocket();
  }

  private async connectWebSocket(): Promise<boolean> {
    if (!this.session || !this.active) return false;

    const token = this.session.ephemeral_token;
    const url = this.session.websocket_url;
    this.handlers.onPhase?.(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    return new Promise((resolve) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(url, [`xai-client-secret.${token}`]);
        ws.binaryType = 'arraybuffer';
      } catch (e) {
        voiceLog('realtime.ws.create-error', { message: e instanceof Error ? e.message : String(e) });
        this.handlers.onFallbackRequired?.();
        resolve(false);
        return;
      }
      this.ws = ws;
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        voiceLog('realtime.ws.timeout');
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
        if (this.ws === ws) this.ws = null;
        if (this.active) this.handlers.onFallbackRequired?.();
        resolve(false);
      }, REALTIME_CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        settled = true;
        clearTimeout(timeout);
        voiceLog('realtime.ws.open');
        this.reconnectAttempts = 0;
        void this.sendSessionUpdate();
        void this.startMicrophone();
        resolve(true);
      };

      ws.onmessage = (evt) => {
        void this.handleMessage(evt);
      };

      ws.onerror = () => {
        voiceLog('realtime.ws.error');
        this.handlers.onError?.('Connexion vocale interrompue');
      };

      ws.onclose = () => {
        voiceLog('realtime.ws.close', { active: this.active });
        clearTimeout(timeout);
        const pending = !settled;
        settled = true;
        if (!this.active) {
          if (pending) resolve(false);
          return;
        }
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts += 1;
          const retry = delay(800 * this.reconnectAttempts).then(() => this.connectWebSocket());
          if (pending) void retry.then(resolve);
          return;
        }
        this.handlers.onFallbackRequired?.();
        if (pending) resolve(false);
      };
    });
  }

  private async sendSessionUpdate(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.session) return;
    const config: VoiceRealtimeSessionConfig = this.session.session_config;
    this.ws.send(
      JSON.stringify({
        type: 'session.update',
        session: config,
      }),
    );
  }

  private async startMicrophone(): Promise<void> {
    const pipeline = PipelineModule;
    if (!ExpoPlayAudioStreamModule || !pipeline || !this.active) return;
    const perms = await ExpoPlayAudioStreamModule.requestPermissionsAsync();
    if (!perms.granted) {
      this.handlers.onError?.('Autorisez le micro dans les réglages pour parler à Cary.');
      return;
    }

    await pipeline.Pipeline.connect({
      sampleRate: 24000,
      channelCount: 1,
      targetBufferMs: 80,
      playbackMode: 'conversation',
      audioMode: 'doNotMix',
    });

    const { subscription } = await ExpoPlayAudioStreamModule.startMicrophone({
      sampleRate: 24000,
      channels: 1,
      encoding: 'pcm_16bit',
      interval: 100,
      onAudioStream: async (event) => {
        if (!this.active || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        if (!event.data) return;
        this.handlers.onEnergy?.(pcm16Base64ToEnergy(event.data));
        const bytes = audioEventToBytes(event.data);
        this.ws.send(bytes);
      },
    });
    this.micSubscription = subscription ?? null;
    this.handlers.onPhase?.('listening');
  }

  private async handleMessage(evt: WebSocketMessageEvent): Promise<void> {
    if (typeof evt.data !== 'string') {
      if (evt.data instanceof ArrayBuffer && PipelineModule) {
        this.handlers.onPhase?.('speaking');
        PipelineModule.Pipeline.pushAudioSync({
          audio: uint8ArrayToBase64(new Uint8Array(evt.data)),
          turnId: String(this.turnId),
          isFirstChunk: false,
          isLastChunk: false,
        });
      }
      return;
    }

    const event = parseRealtimeJsonMessage(evt.data);
    if (!event) return;

    if (isSpeechStarted(event)) {
      this.handlers.onPhase?.('listening');
      return;
    }

    if (isResponseCreated(event)) {
      this.turnId += 1;
      this.assistantBuffer = '';
      await PipelineModule?.Pipeline.invalidateTurn({ turnId: String(this.turnId) });
      this.handlers.onPhase?.('processing');
      return;
    }

    const userText = extractUserTranscript(event);
    if (userText) {
      const interim = event.type.includes('updated');
      this.handlers.onUserTranscript?.(userText, interim);
      if (!interim) {
        void this.syncEvent('user.transcript.final', { transcript: userText });
      }
    }

    const assistantDelta = extractAssistantTranscriptDelta(event);
    if (assistantDelta) {
      this.assistantBuffer += assistantDelta;
      this.handlers.onAssistantTranscript?.(this.assistantBuffer, false);
      this.handlers.onPhase?.('speaking');
    }

    const assistantFinal = extractAssistantTranscriptFinal(event);
    if (assistantFinal) {
      this.assistantBuffer = assistantFinal;
      this.handlers.onAssistantTranscript?.(assistantFinal, true);
      void this.syncEvent('assistant.transcript.final', { transcript: assistantFinal });
    }

    const fnCall = extractFunctionCallDone(event);
    if (fnCall) {
      this.pendingFunctionCalls.push(fnCall);
    }

    if (isResponseDone(event)) {
      await this.flushFunctionCalls();
      this.handlers.onPhase?.('listening');
    }

    const xaiConv = extractXaiConversationId(event);
    if (xaiConv) {
      this.xaiConversationId = xaiConv;
      void this.syncEvent('xai_conversation.created', { xai_conversation_id: xaiConv });
    }
  }

  /** Outils exécutés par le serveur sur la session temps réel ouverte par `start` (jamais une session REST). */
  private async flushFunctionCalls(): Promise<void> {
    const session = this.session;
    if (!session || this.pendingFunctionCalls.length === 0 || !this.ws) return;
    const calls = [...this.pendingFunctionCalls];
    this.pendingFunctionCalls = [];

    const outputs = await Promise.all(
      calls.map(async (call) => {
        try {
          const result = await executeVoiceRealtimeTool(session.session_id, {
            name: call.name,
            arguments: parseToolArguments(call.arguments),
          });
          if (result.draft && this.handlers.onDraftSync) {
            await this.handlers.onDraftSync(result.draft);
          }
          return { callId: call.callId, output: JSON.stringify(result.result ?? {}) };
        } catch (e) {
          voiceLog('realtime.tool.error', { tool: call.name, message: errorMessage(e) });
          return { callId: call.callId, output: JSON.stringify({ error: 'tool_unavailable' }) };
        }
      }),
    );

    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    for (const out of outputs) {
      ws.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: out.callId,
            output: out.output,
          },
        }),
      );
    }
    ws.send(JSON.stringify({ type: 'response.create' }));
  }

  /** Le serveur refuse ces événements hors session temps réel : uniquement la session ouverte par `start`. */
  private async syncEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.session) return;
    try {
      const res = await syncVoiceRealtimeEvent(this.session.session_id, {
        event_id: `${eventType}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        event_type: eventType,
        payload,
      });
      if (res.emergency) this.handlers.onEmergency?.(res.emergency);
      if (res.session_update?.instructions) this.applyInstructions(res.session_update.instructions);
      if (res.draft && this.handlers.onDraftSync) {
        await this.handlers.onDraftSync(res.draft);
      }
      if (res.conversation_id && this.handlers.onConversationSync) {
        await this.handlers.onConversationSync(res.conversation_id);
      }
    } catch (e) {
      voiceLog('realtime.sync.error', { message: errorMessage(e) });
    }
  }

  /** Consignes recalculées par le serveur (brouillon, intention) : appliquées tout de suite et aux reconnexions. */
  private applyInstructions(instructions: string): void {
    if (!this.session) return;
    this.session = { ...this.session, session_config: { ...this.session.session_config, instructions } };
    void this.sendSessionUpdate();
  }

  async interruptAssistant(): Promise<void> {
    if (PipelineModule) {
      await PipelineModule.Pipeline.invalidateTurn({ turnId: String(this.turnId) });
    }
    this.handlers.onPhase?.('listening');
  }

  /** Coupe micro, lecture et socket ; la session serveur est close par l'appelant (`endVoiceSession`). */
  async stop(): Promise<void> {
    this.active = false;
    const release = async (step: string, run: () => unknown) => {
      try {
        await run();
      } catch (e) {
        voiceLog('realtime.stop.error', { step, message: errorMessage(e) });
      }
    };
    await release('mic-subscription', () => this.micSubscription?.remove?.());
    this.micSubscription = null;
    await release('microphone', () => ExpoPlayAudioStreamModule?.stopMicrophone());
    await release('pipeline', () => PipelineModule?.Pipeline.disconnect());
    await release('socket', () => this.ws?.close());
    this.ws = null;
    this.session = null;
  }
}
