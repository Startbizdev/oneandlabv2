import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import { useCallback, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import {
  createAiConversation,
  deleteAiConversation,
  exportAiConversations,
  fetchAiConversationDetail,
  fetchAiConversations,
  fetchAiConversationTranscript,
  patchAiConversation,
} from '../api/ai.service';
import { isLocalAiMessageId, type PatientAiConversation } from '../types/patient-ai-conversation';
import {
  AI_HISTORY_PAGE_SIZE,
  mapAiMessage,
  mapConversationDetail,
  mergeConversationList,
  prependOlderMessages,
  sortConversations,
  updateConversation,
} from '../utils/ai-conversation-state';
import { aiExportFileName, formatConversationExport, shareAiExportFile } from '../utils/ai-conversation-export';
import { AiBusyError } from '../utils/ai-chat-errors';
import { resolveConversationTitle } from '../utils/conversation-title';
import { hydrateMessageAttachments } from '../utils/hydrate-message-attachments';

type Params = {
  activeId: string;
  setActiveId: (id: string) => void;
  conversationsRef: MutableRefObject<PatientAiConversation[]>;
  setConversations: Dispatch<SetStateAction<PatientAiConversation[]>>;
  restoreDraft: (draft: AiAppointmentDraft | null | undefined, conv: PatientAiConversation) => void;
  clearDraft: () => void;
  /** Réponse en cours : aucun changement de conversation possible. */
  busy: boolean;
  discardInFlight: () => void;
};

/** Ouvre la dernière page d'une conversation (pièces jointes rechargées). */
export async function loadAiConversationPage(id: string): Promise<{
  conversation: PatientAiConversation;
  draft: AiAppointmentDraft | null | undefined;
}> {
  const detail = await fetchAiConversationDetail(id, { limit: AI_HISTORY_PAGE_SIZE });
  const mapped = mapConversationDetail(detail.conversation, detail.messages, detail.has_more);
  const messages = await hydrateMessageAttachments(mapped.messages);
  return { conversation: { ...mapped, messages }, draft: detail.draft };
}

/** Historique Cary : ouvrir, créer, renommer, épingler, archiver, exporter, supprimer, remonter le fil. */
export function useAiConversationActions({
  activeId,
  setActiveId,
  conversationsRef,
  setConversations,
  restoreDraft,
  clearDraft,
  busy,
  discardInFlight,
}: Params) {
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);

  const openConversation = useCallback(
    async (id: string) => {
      setActiveId(id);
      clearDraft();
      discardInFlight();
      const { conversation, draft } = await loadAiConversationPage(id);
      setConversations((prev) =>
        prev.some((c) => c.id === id)
          ? updateConversation(prev, id, () => conversation)
          : sortConversations([conversation, ...prev]),
      );
      restoreDraft(draft, conversation);
    },
    [clearDraft, discardInFlight, restoreDraft, setActiveId, setConversations],
  );

  const selectConversation = useCallback(
    async (id: string) => {
      if (id === activeId) return;
      if (busy) throw new AiBusyError();
      await openConversation(id);
    },
    [activeId, busy, openConversation],
  );

  /** Recharge le fil (fin du mode vocal, brouillon clos). */
  const reloadConversation = useCallback(
    async (id: string) => {
      if (!id || busy) return;
      await openConversation(id);
    },
    [busy, openConversation],
  );

  const startNewConversation = useCallback(async () => {
    if (busy) throw new AiBusyError();
    const conv = await createAiConversation({ conversation_type: 'general' });
    await openConversation(conv.id);
  }, [busy, openConversation]);

  const refreshConversationsList = useCallback(
    async (archivedOnly = false) => {
      const list = await fetchAiConversations({ archived: archivedOnly });
      setConversations((prev) => mergeConversationList(prev, list, activeId));
    },
    [activeId, setConversations],
  );

  /** Conversation retirée de la liste (supprimée ou archivée) : ouvre la suivante, sinon une nouvelle. */
  const leaveConversation = useCallback(
    async (id: string) => {
      const remaining = conversationsRef.current.filter((c) => c.id !== id && !c.archivedAt);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId !== id) return;
      const next = remaining[0];
      if (next) await openConversation(next.id);
      else await openConversation((await createAiConversation({ conversation_type: 'general' })).id);
    },
    [activeId, conversationsRef, openConversation, setConversations],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (busy && id === activeId) throw new AiBusyError();
      await deleteAiConversation(id);
      await leaveConversation(id);
    },
    [activeId, busy, leaveConversation],
  );

  const archiveConversation = useCallback(
    async (id: string) => {
      if (busy && id === activeId) throw new AiBusyError();
      await patchAiConversation(id, { archived: true });
      await leaveConversation(id);
    },
    [activeId, busy, leaveConversation],
  );

  const unarchiveConversation = useCallback(
    async (id: string) => {
      await patchAiConversation(id, { archived: false });
      await refreshConversationsList(true);
    },
    [refreshConversationsList],
  );

  const patchListedConversation = useCallback(
    async (id: string, patch: { is_pinned?: boolean; custom_title?: string }) => {
      const updated = await patchAiConversation(id, patch);
      setConversations((prev) =>
        sortConversations(
          updateConversation(prev, id, (c) => ({
            ...c,
            isPinned: updated.is_pinned ?? c.isPinned,
            title: resolveConversationTitle(updated),
          })),
        ),
      );
    },
    [setConversations],
  );

  const togglePinConversation = useCallback(
    async (id: string) => {
      const current = conversationsRef.current.find((c) => c.id === id);
      if (!current || current.isSystem) return;
      await patchListedConversation(id, { is_pinned: !current.isPinned });
    },
    [conversationsRef, patchListedConversation],
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      await patchListedConversation(id, { custom_title: trimmed });
    },
    [patchListedConversation],
  );

  const exportConversation = useCallback(
    async (id: string) => {
      const detail = await fetchAiConversationTranscript(id);
      const title = resolveConversationTitle(detail.conversation);
      const now = new Date();
      await shareAiExportFile(
        aiExportFileName(title, 'txt', now),
        formatConversationExport(title, detail.messages.map(mapAiMessage), now),
      );
    },
    [],
  );

  const exportAllConversations = useCallback(async () => {
    const data = await exportAiConversations();
    const now = new Date();
    await shareAiExportFile(aiExportFileName('conversations', 'json', now), JSON.stringify(data, null, 2));
  }, []);

  /** Page précédente du fil (défilement vers le haut). */
  const loadOlderMessages = useCallback(async () => {
    const conv = conversationsRef.current.find((c) => c.id === activeId);
    const oldest = conv?.messages.find((m) => !isLocalAiMessageId(m.id));
    if (!conv?.hasMore || !oldest || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await fetchAiConversationDetail(conv.id, { before: oldest.id, limit: AI_HISTORY_PAGE_SIZE });
      const older = await hydrateMessageAttachments(page.messages.map(mapAiMessage));
      setConversations((prev) => prependOlderMessages(prev, conv.id, older, page.has_more === true));
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [activeId, conversationsRef, setConversations]);

  return {
    loadingOlder,
    selectConversation,
    reloadConversation,
    startNewConversation,
    refreshConversationsList,
    deleteConversation,
    archiveConversation,
    unarchiveConversation,
    togglePinConversation,
    renameConversation,
    exportConversation,
    exportAllConversations,
    loadOlderMessages,
  };
}
