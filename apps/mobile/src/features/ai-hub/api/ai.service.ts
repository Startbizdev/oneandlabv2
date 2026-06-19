import type {
  AiAppointmentDraft,
  AiChatResponse,
  AiConversation,
  AiHubPayload,
  AiMessage,
  AiQuickSuggestion,
} from '@oneandlab/shared-types';
import { apiRequest } from '@/api/client';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';

export async function fetchAiHub(): Promise<AiHubPayload> {
  const res = await apiRequest<AiHubPayload>('/ai/hub');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Hub IA indisponible');
  return res.data;
}

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

export async function fetchAiConversations(): Promise<AiConversation[]> {
  const res = await apiRequest<AiConversation[]>('/ai/conversations');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Conversations indisponibles');
  return res.data;
}

export async function createAiConversation(input: {
  conversation_type?: string;
  custom_title?: string;
  patient_id?: string;
}): Promise<AiConversation> {
  const res = await apiRequest<AiConversation>('/ai/conversations', { method: 'POST', body: input });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Création conversation impossible');
  return res.data;
}

export async function fetchAiConversationDetail(id: string): Promise<{
  conversation: AiConversation;
  messages: AiMessage[];
  draft?: AiAppointmentDraft | null;
}> {
  const res = await apiRequest<{ conversation: AiConversation; messages: AiMessage[]; draft?: AiAppointmentDraft | null }>(
    `/ai/conversations/${id}`,
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Conversation introuvable');
  return res.data;
}

export async function ensureAiSystemConversation(systemKey: string): Promise<AiConversation> {
  const res = await apiRequest<AiConversation>('/ai/conversations/ensure-system', {
    method: 'POST',
    body: { system_key: systemKey },
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'ensure-system impossible');
  return res.data;
}

export async function deleteAiConversation(id: string): Promise<void> {
  const res = await apiRequest<null>(`/ai/conversations/${id}`, { method: 'DELETE' });
  if (!res.success) throw new Error(res.error ?? 'Suppression impossible');
}

export async function sendAiChatMessage(input: {
  conversation_id: string;
  message: string;
  draft_id?: string;
}): Promise<AiChatResponse> {
  const res = await apiRequest<AiChatResponse>('/ai/chat', { method: 'POST', body: input, timeout: 120_000 });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Erreur chat IA');
  return res.data;
}

export async function patchAiBookingDraft(
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

export async function confirmAiBookingDraft(id: string): Promise<{
  appointment_id: string;
  appointment_ids?: string[];
  draft: AiAppointmentDraft;
}> {
  const res = await apiRequest<{ appointment_id: string; draft: AiAppointmentDraft }>(
    `/ai/booking/drafts/${id}/confirm`,
    { method: 'POST', body: {} },
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Confirmation impossible');
  return res.data;
}

function parseAiChatSseBlock(
  block: string,
  handlers: {
    onDelta: (text: string) => void;
    onDone?: (payload: AiChatResponse) => void;
    onError?: (message: string) => void;
  },
): AiChatResponse | null {
  const lines = block.split('\n');
  let event = 'message';
  let dataLine = '';
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) dataLine = line.slice(5).trim();
  }
  if (!dataLine) return null;
  try {
    const parsed = JSON.parse(dataLine) as Record<string, unknown>;
    if (event === 'delta' && typeof parsed.text === 'string') {
      handlers.onDelta(parsed.text);
    } else if (event === 'done') {
      const payload = parsed as unknown as AiChatResponse;
      handlers.onDone?.(payload);
      return payload;
    } else if (event === 'error') {
      handlers.onError?.(String(parsed.error ?? 'Erreur stream'));
    }
  } catch {
    // ignore malformed chunk
  }
  return null;
}

function consumeAiChatSseBuffer(
  buffer: string,
  handlers: {
    onDelta: (text: string) => void;
    onDone?: (payload: AiChatResponse) => void;
    onError?: (message: string) => void;
  },
): { remainder: string; donePayload: AiChatResponse | null } {
  const parts = buffer.split('\n\n');
  const remainder = parts.pop() ?? '';
  let donePayload: AiChatResponse | null = null;
  for (const block of parts) {
    const done = parseAiChatSseBlock(block, handlers);
    if (done) donePayload = done;
  }
  return { remainder, donePayload };
}

export async function streamAiChatMessage(
  input: { conversation_id: string; message: string; draft_id?: string },
  handlers: {
    onDelta: (text: string) => void;
    onDone?: (payload: AiChatResponse) => void;
    onError?: (message: string) => void;
  },
): Promise<AiChatResponse | null> {
  const token = getAuthToken();
  const url = `${getApiBase()}/ai/chat/stream`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    handlers.onError?.(`Erreur stream (${response.status})`);
    return null;
  }

  // React Native : pas de ReadableStream — la réponse SSE complète est lue en texte (évite double POST).
  if (!response.body) {
    const text = await response.text();
    const { donePayload } = consumeAiChatSseBuffer(`${text}\n\n`, handlers);
    return donePayload;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let donePayload: AiChatResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const consumed = consumeAiChatSseBuffer(buffer, handlers);
    buffer = consumed.remainder;
    if (consumed.donePayload) donePayload = consumed.donePayload;
  }

  if (buffer.trim()) {
    const consumed = consumeAiChatSseBuffer(`${buffer}\n\n`, handlers);
    if (consumed.donePayload) donePayload = consumed.donePayload;
  }

  return donePayload;
}
