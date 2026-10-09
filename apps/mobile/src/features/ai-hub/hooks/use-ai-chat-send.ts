import type { AiAppointmentDraft, AiChatRequest, AiChatResponse, AiEmergency } from '@oneandlab/shared-types';
import { useCallback, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { randomUUID } from '@/lib/uuid';
import { streamAiChatMessage } from '../api/ai.service';
import {
  isLocalAiMessageId,
  type PatientAiChatAttachment,
  type PatientAiChatMessage,
  type PatientAiConversation,
} from '../types/patient-ai-conversation';
import { attachmentApiMessage } from '../utils/ai-attachment-message';
import {
  AI_CHAT_TIMEOUT_MS,
  AI_MESSAGE_MAX_LENGTH,
  AiChatTimeoutError,
  isRegenerateRefused,
} from '../utils/ai-chat-errors';
import { appendMessage, previousUserMessage, removeMessage, updateConversation } from '../utils/ai-conversation-state';
import { normalizeAiEmergency } from '../utils/ai-emergency';
import { normalizeAiFollowUpSuggestions, normalizeAiMessageSources } from '../utils/ai-message-sources';
import { resolveConversationTitle } from '../utils/conversation-title';
import { resolveAssistantMessageText } from '../utils/resolve-assistant-message-text';

/** Envoi en échec : le message reste affiché avec « Réessayer » (même `client_message_id`) ou « Modifier ». */
export type CaryAiSendFailure = {
  conversationId: string;
  userMessageId: string;
  clientMessageId: string;
  text: string;
  attachment?: PatientAiChatAttachment;
  error: unknown;
};

type SendRequest = {
  conversationId: string;
  text: string;
  attachment?: PatientAiChatAttachment;
  clientMessageId: string;
  userMessageId: string;
  /** Faux pour « Réessayer » et « Régénérer » : la question est déjà dans le fil. */
  appendUser: boolean;
  /** « Régénérer » (`regenerate_of`) : réponse remplacée, remise en place si la régénération échoue. */
  regenerate?: { previous: PatientAiChatMessage };
};

type Params = {
  activeId: string;
  conversationsRef: MutableRefObject<PatientAiConversation[]>;
  setConversations: Dispatch<SetStateAction<PatientAiConversation[]>>;
  draftOf: (conversationId: string) => AiAppointmentDraft | null;
  onAssistantPayload: (
    conversationId: string,
    payload: AiChatResponse,
    attachment?: PatientAiChatAttachment,
  ) => Promise<void>;
  /** Régénération en échec : l'ancienne réponse est déjà remise en place. */
  onRegenerateFailed: (error: unknown) => void;
};

function userMessage(req: SendRequest): PatientAiChatMessage {
  return {
    id: req.userMessageId,
    role: 'user',
    text: req.text,
    ...(req.attachment ? { metadata: { attachment: req.attachment } } : {}),
  };
}

function assistantMessage(payload: AiChatResponse, streamed: string, streamEmergency: AiEmergency | null) {
  const sources = normalizeAiMessageSources(payload.message.sources ?? payload.message.metadata?.sources);
  const emergency = normalizeAiEmergency(payload.emergency) ?? streamEmergency;
  const suggestions = normalizeAiFollowUpSuggestions(payload.suggestions);
  const draft = payload.draft ?? payload.message.metadata?.draft;
  const message: PatientAiChatMessage = {
    id: payload.message.id,
    role: 'assistant',
    text: resolveAssistantMessageText(payload.message.content, streamed),
    metadata: {
      ...(draft ? { draft } : {}),
      ...(sources.length ? { sources } : {}),
      ...(emergency ? { emergency } : {}),
      ...(suggestions.length ? { suggestions } : {}),
    },
  };
  return message;
}

function buildChatRequest(req: SendRequest, draft: AiAppointmentDraft | null): AiChatRequest {
  if (req.regenerate) {
    return {
      conversation_id: req.conversationId,
      regenerate_of: req.regenerate.previous.id,
      client_message_id: req.clientMessageId,
      ...(draft?.id ? { draft_id: draft.id } : {}),
    };
  }
  const attachment = req.attachment;
  return {
    conversation_id: req.conversationId,
    message: req.text || attachmentApiMessage(attachment?.documentType ?? 'other', attachment?.fileName),
    client_message_id: req.clientMessageId,
    ...(draft?.id ? { draft_id: draft.id } : {}),
    ...(attachment?.medicalDocumentId ? { medical_document_ids: [attachment.medicalDocumentId] } : {}),
  };
}

/**
 * Envoi d'un message Cary : un seul envoi à la fois (verrou synchrone), identifiant client réutilisé
 * pour « Réessayer », arrêt par l'utilisateur, délai maximal, aucun renvoi automatique.
 */
export function useAiChatSend({
  activeId,
  conversationsRef,
  setConversations,
  draftOf,
  onAssistantPayload,
  onRegenerateFailed,
}: Params) {
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamEmergency, setStreamEmergency] = useState<AiEmergency | null>(null);
  const [sendFailure, setSendFailure] = useState<CaryAiSendFailure | null>(null);
  const [regenerateRefusedIds, setRegenerateRefusedIds] = useState<ReadonlySet<string>>(() => new Set());
  const sendingRef = useRef(false);
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);

  const runSend = useCallback(
    async (req: SendRequest): Promise<boolean> => {
      if (sendingRef.current) return false;
      sendingRef.current = true;
      const generation = ++generationRef.current;
      const isCurrent = () => generation === generationRef.current;
      stopRequestedRef.current = false;
      setAwaitingReply(true);
      setStreamingText('');
      setStreamEmergency(null);
      setSendFailure(null);
      if (req.appendUser) setConversations((prev) => appendMessage(prev, req.conversationId, userMessage(req)));

      const controller = new AbortController();
      controllerRef.current = controller;
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, AI_CHAT_TIMEOUT_MS);
      let streamed = '';
      let emergency: AiEmergency | null = null;
      let payload: AiChatResponse | null = null;

      try {
        payload = await streamAiChatMessage(
          buildChatRequest(req, draftOf(req.conversationId)),
          {
            onDelta: (delta) => {
              streamed += delta;
              if (isCurrent()) setStreamingText(streamed);
            },
            onEmergency: (raw) => {
              emergency = normalizeAiEmergency(raw);
              if (isCurrent()) setStreamEmergency(emergency);
            },
          },
          controller.signal,
        );
      } catch (e) {
        const previous = req.regenerate?.previous;
        if (isCurrent() && previous) {
          setConversations((prev) => appendMessage(prev, req.conversationId, previous));
          if (!stopRequestedRef.current) {
            const error = timedOut ? new AiChatTimeoutError() : e;
            console.warn('[cary-ai] régénération échouée', error);
            if (isRegenerateRefused(error)) setRegenerateRefusedIds((ids) => new Set(ids).add(previous.id));
            onRegenerateFailed(error);
          }
        } else if (isCurrent() && stopRequestedRef.current) {
          setConversations((prev) =>
            appendMessage(prev, req.conversationId, {
              id: `local-stopped-${req.clientMessageId}`,
              role: 'assistant',
              text: streamed ? resolveAssistantMessageText('', streamed) : '',
              interrupted: true,
              clientMessageId: req.clientMessageId,
            }),
          );
        } else if (isCurrent()) {
          const error = timedOut ? new AiChatTimeoutError() : e;
          console.warn('[cary-ai] envoi échoué', error);
          setSendFailure({
            conversationId: req.conversationId,
            userMessageId: req.userMessageId,
            clientMessageId: req.clientMessageId,
            text: req.text,
            attachment: req.attachment,
            error,
          });
        }
      } finally {
        clearTimeout(timer);
        if (isCurrent()) {
          controllerRef.current = null;
          sendingRef.current = false;
          setAwaitingReply(false);
          setStreamingText('');
          setStreamEmergency(null);
        }
      }

      if (!payload || !isCurrent()) return true;
      const reply = assistantMessage(payload, streamed, emergency);
      const title = payload.conversation ? resolveConversationTitle(payload.conversation) : undefined;
      const replacedId = payload.replaced_message_id;
      setConversations((prev) => {
        const withoutReplaced = replacedId ? removeMessage(prev, req.conversationId, replacedId) : prev;
        return updateConversation(appendMessage(withoutReplaced, req.conversationId, reply), req.conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          ...(title ? { title } : {}),
        }));
      });
      await onAssistantPayload(req.conversationId, payload, req.attachment);
      return true;
    },
    [draftOf, onAssistantPayload, onRegenerateFailed, setConversations],
  );

  /** Nouveau message. Faux si refusé (envoi en cours, vide, trop long, pas de conversation). */
  const sendMessage = useCallback(
    (text: string, options?: { attachment?: PatientAiChatAttachment; conversationId?: string }) => {
      const conversationId = options?.conversationId ?? activeId;
      const trimmed = text.trim();
      const attachment = options?.attachment?.medicalDocumentId ? options.attachment : undefined;
      if (!conversationId || sendingRef.current) return Promise.resolve(false);
      if ((!trimmed && !attachment) || trimmed.length > AI_MESSAGE_MAX_LENGTH) return Promise.resolve(false);
      const clientMessageId = randomUUID();
      return runSend({
        conversationId,
        text: trimmed,
        attachment,
        clientMessageId,
        userMessageId: `local-user-${clientMessageId}`,
        appendUser: true,
      });
    },
    [activeId, runSend],
  );

  const retryFailedSend = useCallback(() => {
    if (!sendFailure) return;
    void runSend({ ...sendFailure, appendUser: false });
  }, [runSend, sendFailure]);

  /** Retire le message en échec du fil et rend son texte (et sa pièce jointe) au compositeur. */
  const editFailedSend = useCallback((): { text: string; attachment?: PatientAiChatAttachment } | null => {
    const failure = sendFailure;
    if (!failure) return null;
    setConversations((prev) => removeMessage(prev, failure.conversationId, failure.userMessageId));
    setSendFailure(null);
    return { text: failure.text, attachment: failure.attachment };
  }, [sendFailure, setConversations]);

  const stop = useCallback(() => {
    if (!controllerRef.current) return;
    stopRequestedRef.current = true;
    controllerRef.current.abort();
  }, []);

  /**
   * Dernière réponse du fil : `regenerate_of` + nouvel identifiant client (la question n'est pas renvoyée).
   * Réponse interrompue (locale) : relance du même tour avec son identifiant client d'origine.
   */
  const regenerate = useCallback(
    (messageId: string) => {
      const conversationId = activeId;
      const messages = conversationsRef.current.find((c) => c.id === conversationId)?.messages ?? [];
      const index = messages.length - 1;
      const reply = messages[index];
      if (!reply || reply.id !== messageId || reply.role !== 'assistant' || sendingRef.current) return;
      const question = previousUserMessage(messages, index);
      const local = isLocalAiMessageId(reply.id);
      if (!question || (local && !reply.clientMessageId)) return;
      setConversations((prev) => removeMessage(prev, conversationId, reply.id));
      void runSend({
        conversationId,
        text: question.text,
        attachment: question.metadata?.attachment,
        userMessageId: question.id,
        appendUser: false,
        ...(local && reply.clientMessageId
          ? { clientMessageId: reply.clientMessageId }
          : { clientMessageId: randomUUID(), regenerate: { previous: reply } }),
      });
    },
    [activeId, conversationsRef, runSend, setConversations],
  );

  /** Abandonne l'envoi en cours sans rien afficher (changement de conversation ou d'écran). */
  const discardInFlight = useCallback(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    sendingRef.current = false;
    setAwaitingReply(false);
    setStreamingText('');
    setStreamEmergency(null);
    setSendFailure(null);
  }, []);

  return {
    awaitingReply,
    streamingText,
    streamEmergency,
    sendFailure,
    regenerateRefusedIds,
    sendMessage,
    retryFailedSend,
    editFailedSend,
    stop,
    regenerate,
    discardInFlight,
  };
}
