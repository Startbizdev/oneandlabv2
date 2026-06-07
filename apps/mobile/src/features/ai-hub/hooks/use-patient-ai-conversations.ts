import { useCallback, useMemo, useState } from 'react';
import { patientAiGreeting } from '../constants/patient-ai-mock';
import type { PatientAiChatMessage, PatientAiConversation } from '../types/patient-ai-conversation';

let messageSeq = 0;
let conversationSeq = 0;

export function nextPatientAiMessageId(): string {
  messageSeq += 1;
  return `ai-msg-${messageSeq}`;
}

function nextConversationId(): string {
  conversationSeq += 1;
  return `ai-conv-${conversationSeq}`;
}

function welcomeMessages(firstName: string): PatientAiChatMessage[] {
  return [
    {
      id: nextPatientAiMessageId(),
      role: 'assistant',
      text: patientAiGreeting(firstName),
    },
  ];
}

function buildConversation(
  firstName: string,
  title: string,
  updatedAt: number,
  extraMessages: PatientAiChatMessage[] = [],
): PatientAiConversation {
  const createdAt = updatedAt - 3600_000;
  return {
    id: nextConversationId(),
    title,
    messages: [...welcomeMessages(firstName), ...extraMessages],
    createdAt,
    updatedAt,
  };
}

function seedConversations(firstName: string): PatientAiConversation[] {
  const now = Date.now();
  return [
    buildConversation(firstName, 'Nouvelle conversation', now),
    buildConversation(firstName, 'Résumer mon dossier', now - 86_400_000, [
      {
        id: nextPatientAiMessageId(),
        role: 'user',
        text: 'Résumer mon dossier',
      },
      {
        id: nextPatientAiMessageId(),
        role: 'assistant',
        text: 'Je prépare un résumé de votre dossier médical… (démo)',
      },
    ]),
    buildConversation(firstName, 'Prochain rendez-vous', now - 3 * 86_400_000, [
      {
        id: nextPatientAiMessageId(),
        role: 'user',
        text: 'Préparer mon prochain RDV',
      },
    ]),
    buildConversation(firstName, 'Résultats de labo', now - 8 * 86_400_000, [
      {
        id: nextPatientAiMessageId(),
        role: 'user',
        text: 'Lire mes derniers résultats',
      },
    ]),
  ];
}

export function usePatientAiConversations(firstName: string) {
  const [conversations, setConversations] = useState(() => seedConversations(firstName));
  const [activeId, setActiveId] = useState(() => conversations[0]!.id);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0]!,
    [activeId, conversations],
  );

  const setActiveMessages = useCallback(
    (updater: (prev: PatientAiChatMessage[]) => PatientAiChatMessage[]) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeId) return conv;
          return {
            ...conv,
            messages: updater(conv.messages),
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [activeId],
  );

  const patchActiveConversation = useCallback(
    (patch: Partial<Pick<PatientAiConversation, 'title' | 'messages'>>) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeId) return conv;
          return {
            ...conv,
            ...patch,
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [activeId],
  );

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const startNewConversation = useCallback(() => {
    const fresh: PatientAiConversation = {
      id: nextConversationId(),
      title: 'Nouvelle conversation',
      messages: welcomeMessages(firstName),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
  }, [firstName]);

  return {
    conversations,
    activeConversation,
    activeId,
    setActiveMessages,
    patchActiveConversation,
    selectConversation,
    startNewConversation,
  };
}
