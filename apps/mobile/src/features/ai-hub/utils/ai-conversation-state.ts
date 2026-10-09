import type { AiConversation, AiMessage } from '@oneandlab/shared-types';
import type { PatientAiChatMessage, PatientAiConversation } from '../types/patient-ai-conversation';
import { resolveConversationTitle } from './conversation-title';
import { normalizeAiEmergency } from './ai-emergency';
import { normalizeAiFollowUpSuggestions, normalizeAiMessageSources } from './ai-message-sources';
import { normalizeMessageAttachment } from './hydrate-message-attachments';
import { userMessageDisplayText } from './ai-message-display';

/** Taille d'une page d'historique (`?limit=`). */
export const AI_HISTORY_PAGE_SIZE = 30;

function toTimestamp(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function mapAiMessage(m: AiMessage): PatientAiChatMessage {
  const metadata = m.metadata ?? {};
  const attachment = normalizeMessageAttachment(metadata.attachment);
  const sources = normalizeAiMessageSources(m.sources ?? metadata.sources);
  const emergency = normalizeAiEmergency(metadata.emergency);
  const isUser = m.role === 'user';
  return {
    id: m.id,
    role: isUser ? 'user' : 'assistant',
    text: isUser ? userMessageDisplayText(m.content) : m.content,
    metadata: {
      ...(metadata.draft ? { draft: metadata.draft } : {}),
      ...(metadata.disclaimer ? { disclaimer: metadata.disclaimer } : {}),
      ...(attachment ? { attachment } : {}),
      ...(sources.length ? { sources } : {}),
      ...(emergency ? { emergency } : {}),
    },
  };
}

function baseConversation(conv: AiConversation): Omit<PatientAiConversation, 'messages'> {
  return {
    id: conv.id,
    title: resolveConversationTitle(conv),
    createdAt: toTimestamp(conv.created_at),
    updatedAt: toTimestamp(conv.last_message_at ?? conv.updated_at ?? conv.created_at),
    isSystem: conv.is_system ?? false,
    isPinned: conv.is_pinned ?? false,
    archivedAt: conv.archived_at ? toTimestamp(conv.archived_at) : null,
    contextType: conv.context_type ?? null,
    contextId: conv.context_id ?? null,
    patientId: conv.patient_id ?? null,
  };
}

/** Conversation ouverte : messages de la dernière page et indicateur d'historique plus ancien. */
export function mapConversationDetail(
  conv: AiConversation,
  messages: AiMessage[],
  hasMore: boolean | undefined,
): PatientAiConversation {
  return { ...baseConversation(conv), messages: messages.map(mapAiMessage), hasMore: hasMore === true };
}

/** Entrée de l'historique : garde les messages déjà chargés localement. */
export function mapConversationListItem(conv: AiConversation, existing?: PatientAiConversation): PatientAiConversation {
  return {
    ...baseConversation(conv),
    messages: existing?.messages ?? [],
    hasMore: existing?.hasMore ?? false,
  };
}

export function sortConversations(list: PatientAiConversation[]): PatientAiConversation[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export function updateConversation(
  list: PatientAiConversation[],
  id: string,
  update: (conv: PatientAiConversation) => PatientAiConversation,
): PatientAiConversation[] {
  return list.map((c) => (c.id === id ? update(c) : c));
}

/** Ajoute un message en fin de fil ; sans effet s'il y est déjà (réponse rejouée par le serveur). */
export function appendMessage(
  list: PatientAiConversation[],
  id: string,
  message: PatientAiChatMessage,
): PatientAiConversation[] {
  return updateConversation(list, id, (c) =>
    c.messages.some((m) => m.id === message.id)
      ? c
      : { ...c, messages: [...c.messages, message], updatedAt: Date.now() },
  );
}

export function removeMessage(list: PatientAiConversation[], id: string, messageId: string): PatientAiConversation[] {
  return updateConversation(list, id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== messageId) }));
}

/** Ajoute une page plus ancienne en tête, sans doublon (un serveur sans pagination renvoie tout). */
export function prependOlderMessages(
  list: PatientAiConversation[],
  id: string,
  older: PatientAiChatMessage[],
  hasMore: boolean,
): PatientAiConversation[] {
  return updateConversation(list, id, (c) => {
    const known = new Set(c.messages.map((m) => m.id));
    return { ...c, messages: [...older.filter((m) => !known.has(m.id)), ...c.messages], hasMore };
  });
}

/**
 * Liste serveur (actives ou archives) fusionnée avec l'état local : messages chargés conservés,
 * conversation ouverte toujours gardée (le panneau filtre ensuite sur `archivedAt`).
 */
export function mergeConversationList(
  prev: PatientAiConversation[],
  list: AiConversation[],
  activeId: string,
): PatientAiConversation[] {
  const byId = new Map(prev.map((c) => [c.id, c]));
  const fromApi = list.map((conv) => mapConversationListItem(conv, byId.get(conv.id)));
  const apiIds = new Set(fromApi.map((c) => c.id));
  const active = prev.find((c) => c.id === activeId && !apiIds.has(c.id));
  return sortConversations(active ? [...fromApi, active] : fromApi);
}

/** Entrées du panneau historique pour la vue courante (actives ou archives). */
export function conversationsForView(list: PatientAiConversation[], archived: boolean): PatientAiConversation[] {
  return list.filter((c) => Boolean(c.archivedAt) === archived);
}

/** Dernier message utilisateur avant l'index donné (question à reposer pour « Régénérer »). */
export function previousUserMessage(
  messages: PatientAiChatMessage[],
  beforeIndex: number,
): PatientAiChatMessage | null {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === 'user') return m;
  }
  return null;
}

/** Relances serveur du dernier message assistant, s'il est le dernier du fil. */
export function latestFollowUpSuggestions(messages: PatientAiChatMessage[]): string[] {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant') return [];
  return normalizeAiFollowUpSuggestions(last.metadata?.suggestions);
}
