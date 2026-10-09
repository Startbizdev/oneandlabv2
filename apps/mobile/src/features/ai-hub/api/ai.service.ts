import type {
  AiAppointmentDraft,
  AiChatRequest,
  AiChatResponse,
  AiConversation,
  AiConversationContextType,
  AiConversationDeleteResponse,
  AiConversationDetail,
  AiEmergency,
  AiQuickSuggestion,
  VoiceRealtimeEventSyncResponse,
  VoiceRealtimeStartResponse,
  VoiceRealtimeToolResponse,
} from '@oneandlab/shared-types';
import { apiRequest, apiStreamRequest } from '@/api/client';
import { AiChatStreamError } from '../utils/ai-chat-errors';
import { createAiChatSseReader, type AiChatStreamHandlers } from '../utils/ai-chat-sse';

export async function fetchAiQuickSuggestions(patientId?: string): Promise<{
  suggestions: AiQuickSuggestion[];
  disclaimer: string;
}> {
  const qs = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
  const res = await apiRequest<{ suggestions: AiQuickSuggestion[]; disclaimer: string }>(
    `/ai/quick-suggestions${qs}`,
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Suggestions indisponibles');
  return res.data;
}

export async function fetchAiConversations(opts?: { archived?: boolean }): Promise<AiConversation[]> {
  const qs = opts?.archived ? '?archived=1' : '';
  const res = await apiRequest<AiConversation[]>(`/ai/conversations${qs}`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Conversations indisponibles');
  return res.data;
}

/**
 * Crée une conversation. Avec `context_type` + `context_id`, le serveur renvoie la conversation
 * existante de l'utilisateur pour cet objet au lieu d'en créer une seconde.
 */
export async function createAiConversation(input: {
  conversation_type?: string;
  custom_title?: string;
  patient_id?: string;
  context_type?: AiConversationContextType;
  context_id?: string;
}): Promise<AiConversation> {
  const res = await apiRequest<AiConversation>('/ai/conversations', { method: 'POST', body: input });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Création conversation impossible');
  return res.data;
}

/** Derniers messages (ordre chronologique) ; `before` remonte l'historique page par page. */
export async function fetchAiConversationDetail(
  id: string,
  page?: { before?: string; limit?: number },
): Promise<AiConversationDetail> {
  const query = new URLSearchParams();
  if (page?.before) query.set('before', page.before);
  if (page?.limit) query.set('limit', String(page.limit));
  const qs = query.toString();
  const res = await apiRequest<AiConversationDetail>(
    `/ai/conversations/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`,
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Conversation introuvable');
  return res.data;
}

/** Tous les messages d'une conversation (pages successives), pour l'export. */
export async function fetchAiConversationTranscript(id: string): Promise<AiConversationDetail> {
  const first = await fetchAiConversationDetail(id, { limit: 200 });
  let messages = first.messages;
  let hasMore = first.has_more === true;
  while (hasMore && messages[0]) {
    const page = await fetchAiConversationDetail(id, { before: messages[0].id, limit: 200 });
    const known = new Set(messages.map((m) => m.id));
    const older = page.messages.filter((m) => !known.has(m.id));
    if (older.length === 0) break;
    messages = [...older, ...messages];
    hasMore = page.has_more === true;
  }
  return { ...first, messages, has_more: false };
}

export async function ensureAiSystemConversation(systemKey: string): Promise<AiConversation> {
  const res = await apiRequest<AiConversation>('/ai/conversations/ensure-system', {
    method: 'POST',
    body: { system_key: systemKey },
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Conversation indisponible');
  return res.data;
}

/** Suppression définitive (messages, sessions vocales, brouillons non confirmés) ; documents du dossier conservés. */
export async function deleteAiConversation(id: string): Promise<AiConversationDeleteResponse> {
  const res = await apiRequest<AiConversationDeleteResponse>(`/ai/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.success || !res.data?.deleted) throw new Error(res.error ?? 'Suppression impossible');
  return res.data;
}

async function patchAiBookingDraft(
  id: string,
  payload: Record<string, unknown>,
): Promise<AiAppointmentDraft> {
  const res = await apiRequest<AiAppointmentDraft>(`/ai/booking/drafts/${id}`, {
    method: 'PATCH',
    body: { payload },
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Mise à jour brouillon impossible');
  return res.data;
}

/** Rattache un document envoyé dans le fil au brouillon de demande en cours. */
export function attachDocumentToAiDraft(
  draftId: string,
  docType: string,
  medicalDocumentId: string,
  fileName: string,
): Promise<AiAppointmentDraft> {
  const fileRef = { medical_document_id: medicalDocumentId, field: docType, file_name: fileName };
  return patchAiBookingDraft(draftId, {
    files: { [docType]: fileRef },
    form_data: { files: { [docType]: fileRef } },
  });
}

/** Infirmier / pro : `patient_booking_consent` obligatoire (400 `PATIENT_BOOKING_CONSENT_REQUIRED` sinon). */
export async function confirmAiBookingDraft(
  id: string,
  consent?: { patient_booking_consent: true },
): Promise<{
  appointment_id: string;
  appointment_ids?: string[];
  draft: AiAppointmentDraft;
}> {
  const res = await apiRequest<{ appointment_id: string; appointment_ids?: string[]; draft: AiAppointmentDraft }>(
    `/ai/booking/drafts/${id}/confirm`,
    { method: 'POST', body: consent ?? {} },
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Confirmation impossible');
  return res.data;
}

/**
 * Envoie un message et lit la réponse au fil de l'eau. Rejette si le flux se termine
 * sans réponse finale : l'appelant ne doit jamais renvoyer ce message par un autre canal.
 */
export async function streamAiChatMessage(
  input: AiChatRequest,
  handlers: AiChatStreamHandlers,
  signal: AbortSignal,
): Promise<AiChatResponse> {
  const reader = createAiChatSseReader(handlers);
  await apiStreamRequest('/ai/chat/stream', { body: input, signal }, (chunk) => reader.push(chunk));
  const outcome = reader.finish();
  if (outcome.kind === 'done') return outcome.payload;
  if (outcome.kind === 'error') throw new AiChatStreamError(outcome.code, outcome.retryAfterSeconds);
  throw new AiChatStreamError();
}

export async function analyzeMedicalDocument(medicalDocumentId: string): Promise<{ summary_job_id: string }> {
  const res = await apiRequest<{ summary_job_id: string }>(
    `/ai/documents/${medicalDocumentId}/analyze`,
    { method: 'POST', body: {} },
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Analyse impossible');
  return res.data;
}

export async function patchAiConversation(
  id: string,
  patch: { is_pinned?: boolean; archived?: boolean; custom_title?: string },
): Promise<AiConversation> {
  const res = await apiRequest<AiConversation>(`/ai/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Mise à jour impossible');
  return res.data;
}

export async function searchAiConversations(q: string): Promise<{
  conversations: Array<{ id: string; custom_title?: string }>;
  messages: Array<{ id: string; conversation_id: string; excerpt: string }>;
}> {
  const res = await apiRequest<{
    conversations: Array<{ id: string; custom_title?: string }>;
    messages: Array<{ id: string; conversation_id: string; excerpt: string }>;
  }>(`/ai/search?q=${encodeURIComponent(q)}`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Recherche impossible');
  return res.data;
}

export async function createVoiceSession(input?: {
  conversation_id?: string;
  locale?: string;
}): Promise<{
  id: string;
  ai_conversation_id?: string;
  welcome_text?: string;
  welcome_audio_base64?: string;
  welcome_audio_mime?: string;
}> {
  const res = await apiRequest<{
    id: string;
    ai_conversation_id?: string;
    welcome_text?: string;
    welcome_audio_base64?: string;
    welcome_audio_mime?: string;
  }>('/ai/voice/sessions', {
    method: 'POST',
    body: input ?? {},
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Session vocale impossible');
  return res.data;
}

/** Délai d'un tour vocal (transcription + réponse + synthèse) avant abandon. */
const VOICE_TURN_TIMEOUT_MS = 90_000;

export async function sendVoiceTurn(
  sessionId: string,
  input: {
    audioBase64?: string;
    transcript?: string;
    sttProvider?: 'device' | 'grok_stt';
  },
): Promise<{
  transcript: string;
  assistant_text: string;
  assistant_audio_base64?: string | null;
  assistant_audio_mime?: string | null;
  conversation_id: string;
  disclaimer: string;
  draft?: AiAppointmentDraft | null;
  appointment_id?: string | null;
  emergency?: AiEmergency | null;
}> {
  const res = await apiRequest<{
    transcript: string;
    assistant_text: string;
    assistant_audio_base64?: string | null;
    assistant_audio_mime?: string | null;
    conversation_id: string;
    disclaimer: string;
    draft?: AiAppointmentDraft | null;
    appointment_id?: string | null;
    emergency?: AiEmergency | null;
  }>(`/ai/voice/sessions/${sessionId}/turn`, {
    method: 'POST',
    timeout: VOICE_TURN_TIMEOUT_MS,
    body: {
      audio_base64: input.audioBase64,
      transcript: input.transcript,
      stt_provider: input.sttProvider ?? (input.transcript ? 'device' : 'grok_stt'),
    },
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Tour vocal impossible');
  return res.data;
}

export async function endVoiceSession(sessionId: string): Promise<void> {
  const res = await apiRequest<null>(`/ai/voice/sessions/${sessionId}/end`, { method: 'POST' });
  if (!res.success) throw new Error(res.error ?? 'Clôture session vocale impossible');
}

export async function startVoiceRealtimeSession(input?: {
  conversation_id?: string;
  locale?: string;
}): Promise<VoiceRealtimeStartResponse> {
  const res = await apiRequest<VoiceRealtimeStartResponse>('/ai/voice/realtime', {
    method: 'POST',
    body: input ?? {},
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Session vocale indisponible');
  return res.data;
}

export async function executeVoiceRealtimeTool(
  sessionId: string,
  input: { name: string; arguments: Record<string, unknown> },
): Promise<VoiceRealtimeToolResponse> {
  const res = await apiRequest<VoiceRealtimeToolResponse>(`/ai/voice/sessions/${sessionId}/tool`, {
    method: 'POST',
    body: input,
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Outil vocal indisponible');
  return res.data;
}

export async function syncVoiceRealtimeEvent(
  sessionId: string,
  input: {
    event_id: string;
    event_type: string;
    payload?: Record<string, unknown>;
    latency_ms?: number;
  },
): Promise<VoiceRealtimeEventSyncResponse> {
  const res = await apiRequest<VoiceRealtimeEventSyncResponse>(`/ai/voice/sessions/${sessionId}/events`, {
    method: 'POST',
    body: input,
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Sync événement vocal impossible');
  return res.data;
}

/** Avis sur une réponse : pouce levé = 5, pouce baissé = 1 (`rating` 1 à 5 côté serveur). */
export async function submitAiFeedback(input: {
  rating: number;
  conversation_id?: string;
  message_id?: string;
  comment?: string;
}): Promise<void> {
  const res = await apiRequest<null>('/ai/feedback', { method: 'POST', body: input });
  if (!res.success) throw new Error(res.error ?? 'Avis impossible');
}

export async function exportAiConversations(): Promise<Record<string, unknown>> {
  const res = await apiRequest<Record<string, unknown>>('/ai/export');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Export impossible');
  return res.data;
}
