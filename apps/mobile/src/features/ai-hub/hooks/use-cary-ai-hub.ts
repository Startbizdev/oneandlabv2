import type { AiAppointmentDraft, AiConversation, AiMessage, AiQuickSuggestion } from '@oneandlab/shared-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  confirmAiBookingDraft,
  createAiConversation,
  deleteAiConversation,
  ensureAiSystemConversation,
  fetchAiConversationDetail,
  fetchAiConversations,
  fetchAiQuickSuggestions,
  patchAiBookingDraft,
  sendAiChatMessage,
  streamAiChatMessage,
} from '../api/ai.service';
import type { PatientAiPendingAttachment } from '../components/PatientAiChatComposer';
import {
  uploadPatientProfileDocument,
  type PatientProfileUploadType,
} from '@/features/patients/api/patient-profile.service';
import { pickCarePhoto, carePhotoPickErrorMessage } from '@/lib/uploads/pick-care-photo';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import type { PatientAiChatMessage, PatientAiConversation } from '../types/patient-ai-conversation';
import { AI_PROFILE_DOC_TYPES } from '../utils/ai-draft-documents';
import { mapSuggestionToMessage, systemKeyFromConversationType } from '../utils/ai-navigation';
import { resolveConversationTitle } from '../utils/conversation-title';
import { resolveLatestAiDraft } from '../utils/resolve-latest-ai-draft';
import { isActiveAiDraft } from '../utils/is-active-ai-draft';
import { patchMessageDraft } from '../utils/resolve-message-recap';
import { assistantSignalsRecap } from '../utils/assistant-recap-intent';

const PROFILE_DOC_SET = new Set<string>(AI_PROFILE_DOC_TYPES);

function inferAttachmentDocType(
  draft: AiAppointmentDraft | null,
  override?: string | null,
): string {
  if (override) return override;
  const pending = draft?.payload?.pending_upload_type;
  if (typeof pending === 'string' && pending.trim()) return pending;
  return 'ordonnance';
}

function attachmentConfirmMessage(docType: string): string {
  switch (docType) {
    case 'carte_vitale':
      return 'Voici ma carte Vitale mise à jour.';
    case 'carte_mutuelle':
      return 'Voici ma carte mutuelle mise à jour.';
    case 'autres_assurances':
      return 'Voici mon document autres assurances mis à jour.';
    case 'ordonnance':
      return 'Voici mon ordonnance.';
    default:
      return 'Voici le document joint.';
  }
}

async function applyAttachmentToDraft(
  draftId: string,
  docType: string,
  medicalDocumentId: string,
  fileName: string,
): Promise<AiAppointmentDraft> {
  const fileRef = {
    medical_document_id: medicalDocumentId,
    field: docType,
    file_name: fileName,
  };
  return patchAiBookingDraft(draftId, {
    files: { [docType]: fileRef },
    form_data: { files: { [docType]: fileRef } },
  });
}

export type CaryAiHubInit = {
  conversationType?: string;
  patientId?: string;
  appointmentId?: string;
  labResultId?: string;
  initialMessage?: string;
};

function mapConversation(conv: AiConversation, messages: AiMessage[] = []): PatientAiConversation {
  const updated = conv.last_message_at ?? conv.updated_at ?? conv.created_at;
  return {
    id: conv.id,
    title: resolveConversationTitle(conv),
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.content,
      metadata: m.metadata ?? undefined,
    })),
    createdAt: conv.created_at ? Date.parse(conv.created_at) : Date.now(),
    updatedAt: updated ? Date.parse(updated) : Date.now(),
    isSystem: conv.is_system ?? false,
  };
}

function mapConversationListItem(
  conv: AiConversation,
  existing?: PatientAiConversation,
): PatientAiConversation {
  const updated = conv.last_message_at ?? conv.updated_at ?? conv.created_at;
  return {
    id: conv.id,
    title: resolveConversationTitle(conv),
    messages: existing?.messages ?? [],
    createdAt: conv.created_at ? Date.parse(conv.created_at) : Date.now(),
    updatedAt: updated ? Date.parse(updated) : Date.now(),
    isSystem: conv.is_system ?? false,
  };
}

export function useCaryAiHub(init?: CaryAiHubInit) {
  const { show: showToast } = useToast();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [conversations, setConversations] = useState<PatientAiConversation[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<AiQuickSuggestion[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [activeDraft, setActiveDraft] = useState<AiAppointmentDraft | null>(null);
  const [confirmingDraft, setConfirmingDraft] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PatientAiPendingAttachment | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const initDone = useRef(false);
  const confirmInFlight = useRef(false);
  const sendMessageRef = useRef<(text: string, conversationIdOverride?: string) => Promise<void>>(
    async () => {},
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [activeId, conversations],
  );

  const loadConversationMessages = useCallback(async (id: string) => {
    const detail = await fetchAiConversationDetail(id);
    const mapped = mapConversation(detail.conversation, detail.messages);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? mapped : c)),
    );
    setActiveDraft(isActiveAiDraft(detail.draft) ? detail.draft : resolveLatestAiDraft(mapped.messages));
  }, []);

  const refreshConversationsList = useCallback(async () => {
    const list = await fetchAiConversations();
    setConversations((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      const fromApi = list.map((conv) => mapConversationListItem(conv, byId.get(conv.id)));
      const apiIds = new Set(fromApi.map((c) => c.id));
      const localOnly = prev
        .filter((c) => !apiIds.has(c.id))
        .map((c) => ({
          ...c,
          messages: c.messages ?? [],
        }));
      return [...fromApi, ...localOnly].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const quick = await fetchAiQuickSuggestions(init?.patientId);
        if (cancelled) return;
        setSuggestions(quick.suggestions);
        setDisclaimer(quick.disclaimer);

        let conv: AiConversation;
        const systemKey = systemKeyFromConversationType(init?.conversationType);
        if (systemKey) {
          conv = await ensureAiSystemConversation(systemKey);
        } else {
          const list = await fetchAiConversations();
          if (list.length > 0) {
            conv = list[0]!;
          } else {
            conv = await createAiConversation({
              conversation_type: init?.conversationType ?? 'general',
              patient_id: init?.patientId,
            });
          }
        }

        if (cancelled) return;
        const [detail, list] = await Promise.all([
          fetchAiConversationDetail(conv.id),
          fetchAiConversations().catch(() => [] as AiConversation[]),
        ]);
        const active = mapConversation(detail.conversation, detail.messages);
        const others = list
          .filter((c) => c.id !== conv.id)
          .map((c) => mapConversationListItem(c));
        setConversations([active, ...others]);
        setActiveId(conv.id);
        setActiveDraft(isActiveAiDraft(detail.draft) ? detail.draft : resolveLatestAiDraft(active.messages));

        if (init?.initialMessage && !initDone.current) {
          initDone.current = true;
          setTimeout(() => {
            void sendMessageRef.current(init.initialMessage!, conv.id);
          }, 300);
        }
      } catch {
        if (!cancelled) {
          const fallback = await createAiConversation({ conversation_type: 'general' }).catch(() => null);
          if (fallback) {
            const detail = await fetchAiConversationDetail(fallback.id).catch(() => null);
            if (detail) {
              const mapped = mapConversation(detail.conversation, detail.messages);
              setConversations([mapped]);
              setActiveId(fallback.id);
              setActiveDraft(isActiveAiDraft(detail.draft) ? detail.draft : resolveLatestAiDraft(mapped.messages));
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [init?.conversationType, init?.initialMessage, init?.patientId]);

  const appendLocalMessage = useCallback(
    (convId: string, msg: PatientAiChatMessage) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return {
            ...c,
            messages: [...c.messages, msg],
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string, conversationIdOverride?: string) => {
      const convId = conversationIdOverride ?? activeId;
      const trimmed = text.trim();
      if (!convId || !trimmed || awaitingReply) return;

      setAwaitingReply(true);
      setStreamingText('');
      const userLocalId = `local-user-${Date.now()}`;
      appendLocalMessage(convId, { id: userLocalId, role: 'user', text: trimmed });

      const assistantLocalId = `local-assistant-${Date.now()}`;
      let assembled = '';

      try {
        const convMessages = conversations.find((c) => c.id === convId)?.messages ?? [];
        const draftForSend =
          (isActiveAiDraft(activeDraft) ? activeDraft : null) ??
          resolveLatestAiDraft(convMessages);

        const streamed = await streamAiChatMessage(
          {
            conversation_id: convId,
            message: trimmed,
            draft_id: draftForSend?.id,
          },
          {
            onDelta: (delta) => {
              assembled += delta;
              setStreamingText(assembled);
            },
          },
        );

        const payload =
          streamed ??
          (await sendAiChatMessage({
            conversation_id: convId,
            message: trimmed,
            draft_id: draftForSend?.id,
          }));

        appendLocalMessage(convId, {
          id: payload.message.id ?? assistantLocalId,
          role: 'assistant',
          text: (payload.message.content ?? assembled ?? '').trim() || '…',
          metadata: {
            ...(payload.message.metadata ?? {}),
            draft: payload.draft ?? payload.message.metadata?.draft,
          },
        });
        if (payload.disclaimer) setDisclaimer(payload.disclaimer);
        let resolvedDraft: AiAppointmentDraft | null =
          payload.draft ??
          (payload.message.metadata as { draft?: AiAppointmentDraft } | undefined)?.draft ??
          null;
        const assistantText = (payload.message.content ?? assembled ?? '').trim();
        if (!resolvedDraft?.recap && assistantSignalsRecap(assistantText)) {
          try {
            const detail = await fetchAiConversationDetail(convId);
            if (detail.draft?.id) {
              resolvedDraft = detail.draft;
            }
          } catch {
            /* ignore */
          }
        }
        if (resolvedDraft?.id) {
          setActiveDraft(isActiveAiDraft(resolvedDraft) ? resolvedDraft : null);
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              const msgs = [...c.messages];
              for (let i = msgs.length - 1; i >= 0; i--) {
                if (msgs[i]?.role !== 'assistant') continue;
                msgs[i] = {
                  ...msgs[i]!,
                  metadata: { ...msgs[i]!.metadata, draft: resolvedDraft! },
                };
                break;
              }
              return { ...c, messages: msgs };
            }),
          );
          if (pendingAttachment?.medicalDocumentId && resolvedDraft.id) {
            try {
              const updated = await applyAttachmentToDraft(
                resolvedDraft.id,
                pendingAttachment.documentType,
                pendingAttachment.medicalDocumentId,
                pendingAttachment.fileName,
              );
              setActiveDraft(updated);
              setPendingAttachment(null);
            } catch {
              /* ignore */
            }
          }
        }

        const title = payload.conversation
          ? resolveConversationTitle(payload.conversation)
          : undefined;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  ...(title ? { title } : {}),
                }
              : c,
          ),
        );
      } catch (e) {
        appendLocalMessage(convId, {
          id: assistantLocalId,
          role: 'assistant',
          text: e instanceof Error ? e.message : 'Cary est momentanément indisponible.',
        });
      } finally {
        setStreamingText('');
        setAwaitingReply(false);
      }
    },
    [activeDraft, activeId, appendLocalMessage, awaitingReply, conversations, pendingAttachment],
  );

  sendMessageRef.current = sendMessage;

  const selectConversation = useCallback(
    async (id: string) => {
      setActiveId(id);
      setActiveDraft(null);
      await loadConversationMessages(id);
    },
    [loadConversationMessages],
  );

  const startNewConversation = useCallback(async () => {
    const conv = await createAiConversation({ conversation_type: 'general' });
    const detail = await fetchAiConversationDetail(conv.id);
    const mapped = mapConversation(detail.conversation, detail.messages);
    setConversations((prev) => [mapped, ...prev.filter((c) => c.id !== mapped.id)]);
    setActiveId(conv.id);
    setActiveDraft(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      await deleteAiConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);

      if (activeId !== id) return;

      setActiveDraft(null);
      if (remaining.length > 0) {
        const nextId = remaining[0]!.id;
        setActiveId(nextId);
        await loadConversationMessages(nextId);
        return;
      }
      await startNewConversation();
    },
    [activeId, conversations, loadConversationMessages, startNewConversation],
  );

  const confirmDraft = useCallback(async (draftOverride?: AiAppointmentDraft) => {
    if (confirmInFlight.current) return;
    const draft =
      draftOverride ??
      (isActiveAiDraft(activeDraft) ? activeDraft : null) ??
      resolveLatestAiDraft(activeConversation?.messages ?? []);
    if (!draft) {
      showToast('Aucun rendez-vous à valider.', { type: 'error' });
      return;
    }
    if (draft.status !== 'ready') {
      const hint = draft.missing_fields?.length
        ? `À compléter : ${draft.missing_fields.join(', ')}`
        : 'Complétez les informations avec Cary avant de valider.';
      showToast(hint, { type: 'info' });
      return;
    }
    confirmInFlight.current = true;
    setConfirmingDraft(true);
    try {
      const result = await confirmAiBookingDraft(draft.id);
      const ids = result.appointment_ids?.length
        ? result.appointment_ids
        : [result.appointment_id];

      router.push(`/(patient)/appointment/${ids[0]}`);

      if (activeId) {
        const confirmedDraft = result.draft;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c;
            return {
              ...c,
              messages: [
                ...patchMessageDraft(c.messages, draft.id, confirmedDraft),
                {
                  id: `local-success-${Date.now()}`,
                  role: 'assistant' as const,
                  text:
                    ids.length > 1
                      ? `Vos ${ids.length} rendez-vous ont été créés. Consultez-les dans Mes rendez-vous.`
                      : 'Votre rendez-vous a été créé. Vous pouvez le consulter dans Mes rendez-vous.',
                },
              ],
              updatedAt: Date.now(),
            };
          }),
        );
      }
      setActiveDraft(null);

      try {
        const quick = await fetchAiQuickSuggestions(init?.patientId);
        setSuggestions(quick.suggestions);
      } catch {
        /* ignore */
      }
    } catch (e) {
      appendLocalMessage(activeId, {
        id: `local-error-${Date.now()}`,
        role: 'assistant',
        text: e instanceof Error ? e.message : 'Impossible de confirmer le rendez-vous.',
      });
    } finally {
      confirmInFlight.current = false;
      setConfirmingDraft(false);
    }
  }, [activeConversation?.messages, activeDraft, activeId, appendLocalMessage, init?.patientId, showToast]);

  const handleAttach = useCallback(
    async (docTypeOverride?: string) => {
      if (attaching || awaitingReply) return;
      setAttaching(true);
      try {
        const picked = await pickCarePhoto();
        if (!picked) return;

        const docType = inferAttachmentDocType(activeDraft, docTypeOverride ?? null);
        let medicalDocumentId: string;
        let fileName: string;

        if (PROFILE_DOC_SET.has(docType)) {
          if (!userId) {
            showToast('Session expirée — reconnectez-vous.', { type: 'error' });
            return;
          }
          const uploaded = await uploadPatientProfileDocument(
            userId,
            docType as PatientProfileUploadType,
            picked,
          );
          if (!uploaded?.id) throw new Error('Upload profil impossible');
          medicalDocumentId = uploaded.id;
          fileName = uploaded.file_name ?? picked.fileName;
        } else {
          const uploaded = await uploadMedicalDocument(
            { uri: picked.uri, fileName: picked.fileName, mimeType: picked.mimeType },
            { document_type: docType },
          );
          medicalDocumentId = uploaded.id;
          fileName = picked.fileName;
        }

        if (activeDraft?.id) {
          const updated = await applyAttachmentToDraft(
            activeDraft.id,
            docType,
            medicalDocumentId,
            fileName,
          );
          setActiveDraft(updated);
          setPendingAttachment(null);
          if (activeId) {
            void sendMessage(attachmentConfirmMessage(docType));
          }
        } else {
          setPendingAttachment({
            fileName,
            documentType: docType,
            medicalDocumentId,
          });
          showToast('Document prêt — décrivez votre RDV à Cary pour continuer.');
        }
      } catch (e) {
        showToast(carePhotoPickErrorMessage(e), { type: 'error' });
      } finally {
        setAttaching(false);
      }
    },
    [
      activeDraft,
      activeId,
      attaching,
      awaitingReply,
      sendMessage,
      showToast,
      userId,
    ],
  );

  const handleReplaceDocument = useCallback(
    (docType: string) => {
      void handleAttach(docType);
    },
    [handleAttach],
  );

  const clearAttachment = useCallback(() => {
    setPendingAttachment(null);
  }, []);

  const handleSuggestion = useCallback(
    (item: AiQuickSuggestion) => {
      void sendMessage(mapSuggestionToMessage(item.id));
    },
    [sendMessage],
  );

  return {
    loading,
    conversations,
    activeConversation,
    activeId,
    suggestions,
    disclaimer,
    awaitingReply,
    streamingText,
    activeDraft,
    confirmingDraft,
    selectConversation,
    startNewConversation,
    deleteConversation,
    refreshConversationsList,
    sendMessage,
    handleSuggestion,
    confirmDraft,
    handleAttach,
    handleReplaceDocument,
    clearAttachment,
    pendingAttachment,
    attaching,
  };
}
