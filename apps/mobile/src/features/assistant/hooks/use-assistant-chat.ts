import type { AssistantContextType, AssistantConversation, AssistantMessage } from '@oneandlab/shared-types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { queryKeys } from '@/lib/query-keys';
import { randomUUID } from '@/lib/uuid';
import { getConversation, streamChat } from '../api/assistant.service';
import { assistantErrorMessage, isAssistantErrorRetryable } from '../utils/assistant-errors';
import { createLiveTurnStore, type LiveTurn } from '../utils/live-turn';

export type AssistantChatScope = {
  context?: { type: AssistantContextType; id?: string };
  /** Soignant : patient sélectionné. */
  patientId?: string;
};

/** Abonnement facultatif au flux (lecture vocale). `onEnd(true)` quand la réponse est complète. */
export type SendHooks = { onDelta?: (text: string) => void; onEnd?: (completed: boolean) => void };

const EMPTY: AssistantMessage[] = [];

type Reply = Pick<AssistantMessage, 'id' | 'text' | 'actions'>;

function settledMessages(turn: LiveTurn, userMessageId: string, reply?: Reply) {
  const now = new Date().toISOString();
  const messages: AssistantMessage[] = [
    { id: userMessageId || `local-${turn.clientMessageId}`, role: 'user', text: turn.userText, actions: [], created_at: now },
  ];
  if (reply && (reply.text || reply.actions.length > 0)) {
    messages.push({ id: reply.id, role: 'assistant', text: reply.text, actions: reply.actions, created_at: now });
  }
  return messages;
}

/** Conversation affichée (TanStack Query) + tour en direct (store dédié) : envoi, arrêt, nouvel essai. */
export function useAssistantChat(scope: AssistantChatScope) {
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [live] = useState(createLiveTurnStore);
  const phase = useStore(live.store, (s) => s.phase);
  const abortRef = useRef<AbortController | null>(null);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;
  /** Conversation créée par un envoi en échec : « Réessayer » et le message suivant la poursuivent. */
  const createdIdRef = useRef<string | null>(null);

  const detail = useQuery({
    queryKey: queryKeys.assistant.conversation(conversationId ?? ''),
    queryFn: () => getConversation(conversationId ?? ''),
    enabled: Boolean(conversationId),
    staleTime: 30_000,
  });

  /** Range le tour terminé (ou interrompu) dans le cache de la conversation, puis libère le tour en direct. */
  const commit = useCallback(
    (id: string, userMessageId: string, reply?: Reply) => {
      const turn = live.store.getState();
      const added = settledMessages(turn, userMessageId, reply);
      qc.setQueryData<AssistantConversation>(queryKeys.assistant.conversation(id), (old) => ({
        id,
        title: old?.title ?? turn.userText.slice(0, 60),
        messages: [...(old?.messages ?? []).filter((m) => !added.some((a) => a.id === m.id)), ...added],
      }));
      setConversationId(id);
      createdIdRef.current = null;
      live.dispatch({ type: 'reset' });
      void qc.invalidateQueries({ queryKey: queryKeys.assistant.conversations });
    },
    [live, qc],
  );

  const run = useCallback(
    async (hooks?: SendHooks) => {
      const turn = live.store.getState();
      const controller = new AbortController();
      abortRef.current = controller;
      const { context, patientId } = scopeRef.current;
      const knownId = conversationIdRef.current ?? createdIdRef.current;
      let started = { conversationId: knownId ?? '', userMessageId: '' };
      try {
        const reply = await streamChat(
          {
            ...(knownId ? { conversation_id: knownId } : {}),
            message: turn.userText,
            client_message_id: turn.clientMessageId,
            ...(context ? { context } : {}),
            ...(patientId ? { patient_id: patientId } : {}),
            ...(turn.documentId ? { document_id: turn.documentId } : {}),
          },
          {
            onStart: (s) => {
              started = { conversationId: s.conversationId || started.conversationId, userMessageId: s.userMessageId };
            },
            onStatus: (text) => live.dispatch({ type: 'status', text }),
            onDelta: (text) => {
              live.dispatch({ type: 'delta', text });
              hooks?.onDelta?.(text);
            },
            onAction: (action) => live.dispatch({ type: 'action', action }),
            onEmergency: (emergency) => live.dispatch({ type: 'emergency', emergency }),
          },
          controller.signal,
        );
        const current = live.store.getState();
        commit(reply.conversationId || started.conversationId, started.userMessageId, {
          id: reply.messageId,
          text: reply.text || current.text,
          actions: reply.actions.length > 0 ? reply.actions : current.actions,
        });
        hooks?.onEnd?.(true);
      } catch (err) {
        hooks?.onEnd?.(false);
        if (controller.signal.aborted) {
          // Arrêt volontaire : on garde ce qui est déjà affiché.
          const current = live.store.getState();
          if (started.conversationId) {
            commit(started.conversationId, started.userMessageId, {
              id: `local-reply-${current.clientMessageId}`,
              text: current.text,
              actions: current.actions,
            });
            void qc.invalidateQueries({
              queryKey: queryKeys.assistant.conversation(started.conversationId),
              refetchType: 'none',
            });
          } else {
            live.dispatch({ type: 'reset' });
          }
          return;
        }
        console.warn('[assistant] réponse en échec', err);
        if (started.conversationId) createdIdRef.current = started.conversationId;
        live.dispatch({ type: 'error', message: assistantErrorMessage(err), retryable: isAssistantErrorRetryable(err) });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [commit, live, qc],
  );

  const send = useCallback(
    (text: string, opts?: { documentId?: string } & SendHooks) => {
      const message = text.trim();
      if (!message || live.store.getState().phase === 'streaming') return false;
      live.dispatch({ type: 'send', clientMessageId: randomUUID(), userText: message, documentId: opts?.documentId });
      void run(opts);
      return true;
    },
    [live, run],
  );

  const retry = useCallback(() => {
    if (live.store.getState().phase !== 'error') return;
    live.dispatch({ type: 'retry' });
    void run();
  }, [live, run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const openConversation = useCallback(
    (id: string | null) => {
      abortRef.current?.abort();
      abortRef.current = null;
      createdIdRef.current = null;
      // Un envoi juste après (message d'ouverture) doit déjà viser la nouvelle conversation.
      conversationIdRef.current = id;
      live.dispatch({ type: 'reset' });
      setConversationId(id);
    },
    [live],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    conversationId,
    title: conversationId ? detail.data?.title : undefined,
    messages: conversationId ? (detail.data?.messages ?? EMPTY) : EMPTY,
    detail,
    live,
    phase,
    send,
    retry,
    stop,
    openConversation,
  };
}
