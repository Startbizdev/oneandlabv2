import type { AiChatResponse, AiConversation, AiQuickSuggestion } from '@oneandlab/shared-types';
import type { MobileRole } from '@oneandlab/shared-constants';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import {
  createAiConversation,
  ensureAiSystemConversation,
  fetchAiConversations,
  fetchAiQuickSuggestions,
  submitAiFeedback,
} from '../api/ai.service';
import {
  isLocalAiMessageId,
  type PatientAiChatAttachment,
  type PatientAiConversation,
} from '../types/patient-ai-conversation';
import { resolveAiAttachmentTarget } from '../utils/ai-attachment-target';
import { aiRegenerateErrorMessage } from '../utils/ai-chat-errors';
import { contextPatientId, type AiConversationContext } from '../utils/ai-conversation-context';
import { latestFollowUpSuggestions } from '../utils/ai-conversation-state';
import { buildAiStarterSuggestions, followUpPromptSuggestions } from '../utils/ai-starter-suggestions';
import { useAiAttachment } from './use-ai-attachment';
import { useAiBookingDraft } from './use-ai-booking-draft';
import { useAiChatSend } from './use-ai-chat-send';
import { loadAiConversationPage, useAiConversationActions } from './use-ai-conversation-actions';

export type { CaryAiSendFailure } from './use-ai-chat-send';

export type AiMessageRating = 'up' | 'down';

const GENERAL_CONTEXT: AiConversationContext = { kind: 'general', key: 'general' };

/** Conversation à ouvrir pour le contexte : celle de l'objet, la conversation système, ou la dernière générale. */
async function resolveContextConversation(context: AiConversationContext): Promise<AiConversation> {
  switch (context.kind) {
    case 'object':
      return createAiConversation({
        conversation_type: context.conversationType,
        patient_id: context.patientId,
        context_type: context.contextType,
        context_id: context.contextId,
      });
    case 'system':
      return ensureAiSystemConversation(context.systemKey);
    case 'general': {
      const list = await fetchAiConversations();
      const general = list.find((c) => !c.is_system && (!c.context_type || c.context_type === 'general'));
      return general ?? createAiConversation({ conversation_type: 'general' });
    }
  }
}

/** État de l'écran Cary pour un rôle et un contexte (objet, conversation système ou générale). */
export function useCaryAiHub({ role, context }: { role: MobileRole; context: AiConversationContext }) {
  const { show: showToast } = useToast();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [conversations, setConversationsState] = useState<PatientAiConversation[]>([]);
  const conversationsRef = useRef<PatientAiConversation[]>([]);
  const setConversations = useCallback<Dispatch<SetStateAction<PatientAiConversation[]>>>((action) => {
    setConversationsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      conversationsRef.current = next;
      return next;
    });
  }, []);
  const [activeId, setActiveId] = useState('');
  const [contextConversationId, setContextConversationId] = useState('');
  const [quickSuggestions, setQuickSuggestions] = useState<AiQuickSuggestion[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<unknown>(null);
  const [initAttempt, setInitAttempt] = useState(0);
  const [pendingInitial, setPendingInitial] = useState<{ conversationId: string; text: string } | null>(null);
  const [ratings, setRatings] = useState<Record<string, AiMessageRating>>({});
  const initialSentKeysRef = useRef(new Set<string>());
  const reloadRef = useRef<(id: string) => Promise<void>>(() => Promise.resolve());

  const onDraftClosed = useCallback((conversationId: string) => {
    reloadRef.current(conversationId).catch((e: unknown) => console.warn('[cary-ai] rechargement du fil impossible', e));
  }, []);
  const draft = useAiBookingDraft({ role, activeId, conversationsRef, setConversations, showToast, onDraftClosed });
  const { applyAssistantDraft, restoreDraft, setActiveDraft } = draft;

  const onAssistantPayload = useCallback(
    async (conversationId: string, payload: AiChatResponse, attachment?: PatientAiChatAttachment) => {
      if (payload.disclaimer) setDisclaimer(payload.disclaimer);
      await applyAssistantDraft(conversationId, payload, attachment);
    },
    [applyAssistantDraft],
  );
  const onRegenerateFailed = useCallback(
    (error: unknown) => showToast(aiRegenerateErrorMessage(error), { type: 'error' }),
    [showToast],
  );
  const send = useAiChatSend({
    activeId,
    conversationsRef,
    setConversations,
    draftOf: draft.draftOf,
    onAssistantPayload,
    onRegenerateFailed,
  });
  const { discardInFlight, sendMessage } = send;

  const clearDraft = useCallback(() => setActiveDraft(null), [setActiveDraft]);
  const actions = useAiConversationActions({
    activeId,
    setActiveId,
    conversationsRef,
    setConversations,
    restoreDraft,
    clearDraft,
    busy: send.awaitingReply,
    discardInFlight,
  });
  const { reloadConversation } = actions;
  useEffect(() => {
    reloadRef.current = reloadConversation;
  }, [reloadConversation]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [activeId, conversations],
  );
  const inContext = Boolean(activeId) && activeId === contextConversationId;
  const attachmentTarget = useMemo(
    () => resolveAiAttachmentTarget(role, activeConversation, inContext ? contextPatientId(context) : undefined),
    [activeConversation, context, inContext, role],
  );
  const attachment = useAiAttachment({
    userId,
    target: attachmentTarget,
    activeDraft: draft.activeDraft,
    setActiveDraft,
    busy: send.awaitingReply,
    showToast,
  });
  const { clearAttachment } = attachment;

  useEffect(() => {
    let cancelled = false;
    discardInFlight();
    clearAttachment();
    setConversations([]);
    setActiveId('');
    setContextConversationId('');
    setActiveDraft(null);
    setPendingInitial(null);
    setInitError(null);
    setLoading(true);
    const quick = fetchAiQuickSuggestions(contextPatientId(context)).catch((e: unknown) => {
      console.warn('[cary-ai] suggestions indisponibles, questions par défaut', e);
      return null;
    });
    (async () => {
      try {
        const conv = await resolveContextConversation(context);
        const page = await loadAiConversationPage(conv.id);
        if (cancelled) return;
        setConversations([page.conversation]);
        setActiveId(conv.id);
        setContextConversationId(conv.id);
        restoreDraft(page.draft, page.conversation);
        const initialMessage = context.initialMessage;
        const hasUserMessage = page.conversation.messages.some((m) => m.role === 'user');
        if (initialMessage && !hasUserMessage && !initialSentKeysRef.current.has(context.key)) {
          initialSentKeysRef.current.add(context.key);
          setPendingInitial({ conversationId: conv.id, text: initialMessage });
        }
        const suggestions = await quick;
        if (!cancelled && suggestions) {
          setQuickSuggestions(suggestions.suggestions);
          setDisclaimer(suggestions.disclaimer);
        }
      } catch (e) {
        if (cancelled) return;
        console.warn('[cary-ai] ouverture de la conversation impossible', e);
        setInitError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearAttachment, context, discardInFlight, initAttempt, restoreDraft, setActiveDraft, setConversations]);

  useEffect(() => {
    if (!pendingInitial || pendingInitial.conversationId !== activeId) return;
    setPendingInitial(null);
    void sendMessage(pendingInitial.text, { conversationId: pendingInitial.conversationId });
  }, [activeId, pendingInitial, sendMessage]);

  const retryInit = useCallback(() => setInitAttempt((n) => n + 1), []);

  const rateMessage = useCallback(
    async (messageId: string, rating: AiMessageRating) => {
      if (isLocalAiMessageId(messageId) || ratings[messageId]) return;
      setRatings((prev) => ({ ...prev, [messageId]: rating }));
      try {
        await submitAiFeedback({ rating: rating === 'up' ? 5 : 1, conversation_id: activeId, message_id: messageId });
        showToast('Merci pour votre avis');
      } catch (e) {
        console.warn('[cary-ai] avis non envoyé', e);
        setRatings((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
        showToast("Votre avis n'a pas pu être envoyé.", { type: 'error' });
      }
    },
    [activeId, ratings, showToast],
  );

  const starterSuggestions = useMemo(
    () => buildAiStarterSuggestions({ role, context: inContext ? context : GENERAL_CONTEXT, quick: quickSuggestions }),
    [context, inContext, quickSuggestions, role],
  );
  const followUpSuggestions = useMemo(
    () => followUpPromptSuggestions(latestFollowUpSuggestions(activeConversation?.messages ?? [])),
    [activeConversation?.messages],
  );

  return {
    loading,
    initError,
    retryInit,
    conversations,
    activeConversation,
    activeId,
    /** La conversation ouverte est celle de l'objet reçu en paramètre (pastille de contexte). */
    inContext: inContext && context.kind === 'object',
    disclaimer,
    starterSuggestions,
    followUpSuggestions,
    ratings,
    rateMessage,
    ...send,
    ...draft,
    ...actions,
    ...attachment,
  };
}
