import type { PatientAiConversation } from '../types/patient-ai-conversation';

export type ConversationSection = {
  key: string;
  title: string;
  data: PatientAiConversation[];
};

const DAY_MS = 86_400_000;

/** Historique : épinglées d'abord, puis par récence, groupées Aujourd'hui / Hier / 7 jours / Plus ancien. */
export function groupConversations(conversations: PatientAiConversation[], now = Date.now()): ConversationSection[] {
  const sorted = [...conversations].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
  const today: PatientAiConversation[] = [];
  const yesterday: PatientAiConversation[] = [];
  const week: PatientAiConversation[] = [];
  const older: PatientAiConversation[] = [];

  for (const conv of sorted) {
    const diffDays = Math.floor((now - conv.updatedAt) / DAY_MS);
    if (diffDays <= 0) today.push(conv);
    else if (diffDays === 1) yesterday.push(conv);
    else if (diffDays < 7) week.push(conv);
    else older.push(conv);
  }

  const sections: ConversationSection[] = [];
  if (today.length) sections.push({ key: 'today', title: "Aujourd'hui", data: today });
  if (yesterday.length) sections.push({ key: 'yesterday', title: 'Hier', data: yesterday });
  if (week.length) sections.push({ key: 'week', title: '7 derniers jours', data: week });
  if (older.length) sections.push({ key: 'older', title: 'Plus ancien', data: older });
  return sections;
}

export function conversationsEmptyCopy(searching: boolean, showArchived: boolean) {
  if (searching) {
    return { illustration: 'search' as const, title: 'Aucun résultat', description: 'Essayez un autre mot.' };
  }
  if (showArchived) {
    return { illustration: 'messages' as const, title: 'Aucune archive', description: undefined };
  }
  return {
    illustration: 'messages' as const,
    title: 'Aucune conversation',
    description: 'Vos échanges avec Cary apparaîtront ici.',
  };
}
