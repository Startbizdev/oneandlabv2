import { useCallback, useEffect, useMemo, useState } from 'react';
import { searchAiConversations } from '../api/ai.service';
import type { PatientAiConversation } from '../types/patient-ai-conversation';
import { aiActionErrorMessage } from '../utils/ai-chat-errors';
import { conversationsForView } from '../utils/ai-conversation-state';
import type { ConversationRowActionKey } from '../utils/conversation-row-actions';

const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

type SearchState = { status: 'idle' } | { status: 'hits'; ids: Set<string> } | { status: 'failed' };

interface Params {
  open: boolean;
  conversations: PatientAiConversation[];
  refreshConversationsList: (archived: boolean) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  togglePinConversation: (id: string) => Promise<void>;
  archiveConversation: (id: string) => Promise<void>;
  unarchiveConversation: (id: string) => Promise<void>;
  exportConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  exportAllConversations: () => Promise<void>;
}

/** Panneau historique : liste rafraîchie à l'ouverture, recherche, archives et actions par conversation. */
export function useCaryAiHistory({
  open,
  conversations,
  refreshConversationsList,
  renameConversation,
  togglePinConversation,
  archiveConversation,
  unarchiveConversation,
  exportConversation,
  deleteConversation,
  exportAllConversations,
}: Params) {
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState<SearchState>({ status: 'idle' });
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setListError(null);
    refreshConversationsList(showArchived).catch((e: unknown) => {
      console.warn('[cary-ai] historique indisponible', e);
      setListError(aiActionErrorMessage(e, 'Historique indisponible. Réessayez.'));
    });
  }, [open, refreshConversationsList, showArchived]);

  useEffect(() => {
    const q = query.trim();
    setSearch({ status: 'idle' });
    if (q.length < SEARCH_MIN_LENGTH) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchAiConversations(q)
        .then((hits) => {
          if (cancelled) return;
          const ids = new Set(hits.conversations.map((c) => c.id));
          hits.messages.forEach((m) => ids.add(m.conversation_id));
          setSearch({ status: 'hits', ids });
        })
        .catch((e: unknown) => {
          console.warn('[cary-ai] recherche serveur indisponible, filtre sur les titres', e);
          if (!cancelled) setSearch({ status: 'failed' });
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const visibleConversations = useMemo(() => {
    const inView = conversationsForView(conversations, showArchived);
    const q = query.trim().toLowerCase();
    if (q.length < SEARCH_MIN_LENGTH) return inView;
    if (search.status === 'hits') return inView.filter((c) => search.ids.has(c.id));
    return inView.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query, search, showArchived]);

  const onRowAction = useCallback(
    async (id: string, key: ConversationRowActionKey, title?: string): Promise<string | null> => {
      try {
        switch (key) {
          case 'rename':
            await renameConversation(id, title ?? '');
            break;
          case 'pin':
          case 'unpin':
            await togglePinConversation(id);
            break;
          case 'archive':
            await archiveConversation(id);
            break;
          case 'restore':
            await unarchiveConversation(id);
            break;
          case 'export':
            await exportConversation(id);
            break;
          case 'delete':
            await deleteConversation(id);
            break;
        }
        return null;
      } catch (e) {
        console.warn('[cary-ai] action sur la conversation impossible', key, e);
        return aiActionErrorMessage(e, key === 'export' ? 'Export impossible. Réessayez.' : 'Action impossible. Réessayez.');
      }
    },
    [archiveConversation, deleteConversation, exportConversation, renameConversation, togglePinConversation, unarchiveConversation],
  );

  const onExportAll = useCallback(async (): Promise<string | null> => {
    try {
      await exportAllConversations();
      return null;
    } catch (e) {
      console.warn('[cary-ai] export des conversations impossible', e);
      return aiActionErrorMessage(e, 'Export impossible. Réessayez.');
    }
  }, [exportAllConversations]);

  const toggleArchived = useCallback(() => setShowArchived((v) => !v), []);

  return {
    query,
    setQuery,
    showArchived,
    toggleArchived,
    listError,
    visibleConversations,
    onRowAction,
    onExportAll,
  };
}
