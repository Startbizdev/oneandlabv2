import type {
  AssistantAction,
  AssistantChatRequest,
  AssistantConversation,
  AssistantConversationSummary,
  AssistantSettings,
} from '@oneandlab/shared-types';
import { apiRequest, apiStreamRequest } from '@/api/client';
import { AssistantStreamError } from '../utils/assistant-errors';
import { createAssistantSseReader, parseActions, type AssistantStreamHandlers } from '../utils/assistant-sse';

export type AssistantReply = {
  messageId: string;
  conversationId: string;
  text: string;
  actions: AssistantAction[];
  /** Soignant : patient compris par Cary dans la question. */
  patientId?: string;
};

export const CONVERSATIONS_PAGE_SIZE = 20;

/** Envoie un message et lit la réponse en direct ; rejette `AssistantStreamError` sur `event: error` ou flux coupé. */
export async function streamChat(
  body: AssistantChatRequest,
  handlers: AssistantStreamHandlers,
  signal: AbortSignal,
): Promise<AssistantReply> {
  const reader = createAssistantSseReader(handlers);
  await apiStreamRequest('/assistant/chat', { body, signal }, (chunk) => reader.push(chunk));
  const outcome = reader.finish();
  if (outcome.kind === 'done') return outcome;
  if (outcome.kind === 'error') throw new AssistantStreamError(outcome.code, outcome.retryAfter);
  throw new AssistantStreamError();
}

export async function listConversations(
  page: number,
): Promise<{ items: AssistantConversationSummary[]; hasMore: boolean }> {
  const res = await apiRequest<AssistantConversationSummary[]>(
    `/assistant/conversations?page=${page}&limit=${CONVERSATIONS_PAGE_SIZE}`,
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Conversations indisponibles');
  const p = res.pagination;
  const hasMore = p ? p.page * p.limit < p.total : res.data.length >= CONVERSATIONS_PAGE_SIZE;
  return { items: res.data, hasMore };
}

export async function getConversation(id: string): Promise<AssistantConversation> {
  const res = await apiRequest<AssistantConversation>(`/assistant/conversations/${encodeURIComponent(id)}?limit=30`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Conversation introuvable');
  return {
    ...res.data,
    messages: (res.data.messages ?? []).map((m) => ({ ...m, actions: parseActions(m.actions) })),
  };
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await apiRequest(`/assistant/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.success) throw new Error(res.error ?? 'Suppression impossible');
}

/** Patient : lecture automatique de ses résultats par Cary (accord révocable). */
export async function getAssistantSettings(): Promise<AssistantSettings> {
  const res = await apiRequest<AssistantSettings>('/assistant/settings');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Réglages indisponibles');
  return res.data;
}

export async function setResultsReading(enabled: boolean): Promise<AssistantSettings> {
  const res = await apiRequest<AssistantSettings>('/assistant/settings', { method: 'PUT', body: { results_reading: enabled } });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Réglage impossible');
  return res.data;
}
