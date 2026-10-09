import type { AiAppointmentDraft, AiChatResponse } from '@oneandlab/shared-types';
import { STAFF_PATIENT_BOOKING_CONSENT_ERROR, type MobileRole } from '@oneandlab/shared-constants';
import { useCallback, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { router } from 'expo-router';
import { aiBookingDraftErrorMessage, isAiDraftClosedError, isPatientBookingConsentRequired } from '@oneandlab/shared-api';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { apiErrorMessage } from '@/lib/errors/handle-api-error';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import { attachDocumentToAiDraft, confirmAiBookingDraft, fetchAiConversationDetail } from '../api/ai.service';
import type { PatientAiChatAttachment, PatientAiConversation } from '../types/patient-ai-conversation';
import { aiBookingRequiresPatientConsent } from '../utils/ai-booking-access';
import { appendMessage, updateConversation } from '../utils/ai-conversation-state';
import { isActiveAiDraft } from '../utils/is-active-ai-draft';
import { resolveLatestAiDraft } from '../utils/resolve-latest-ai-draft';
import { patchMessageDraft } from '../utils/resolve-message-recap';

type Params = {
  role: MobileRole;
  activeId: string;
  conversationsRef: MutableRefObject<PatientAiConversation[]>;
  setConversations: Dispatch<SetStateAction<PatientAiConversation[]>>;
  showToast: (title: string, opts?: { type?: 'success' | 'error' | 'info' }) => void;
  /** Brouillon clos côté serveur (déjà confirmé, expiré) : recharger le fil. */
  onDraftClosed: (conversationId: string) => void;
};

/** Consentement du patient (infirmier / pro), coché pour un brouillon précis. */
export type AiBookingConsent = {
  checkedDraftId: string | null;
  errorDraftId: string | null;
  toggle: (draftId: string) => void;
};

/** Brouillon de demande de rendez-vous préparé par Cary : suivi, pièces jointes, confirmation. */
export function useAiBookingDraft({
  role,
  activeId,
  conversationsRef,
  setConversations,
  showToast,
  onDraftClosed,
}: Params) {
  const [activeDraft, setActiveDraft] = useState<AiAppointmentDraft | null>(null);
  const [confirmingDraft, setConfirmingDraft] = useState(false);
  const confirmInFlight = useRef(false);
  const consentRequired = aiBookingRequiresPatientConsent(role);
  const [consent, setConsent] = useState<{ checked: string | null; error: string | null }>({ checked: null, error: null });
  const toggleConsent = useCallback((draftId: string) => {
    setConsent((prev) => ({ checked: prev.checked === draftId ? null : draftId, error: null }));
  }, []);
  const bookingConsent = useMemo<AiBookingConsent | null>(
    () => (consentRequired ? { checkedDraftId: consent.checked, errorDraftId: consent.error, toggle: toggleConsent } : null),
    [consent, consentRequired, toggleConsent],
  );

  const draftOf = useCallback(
    (conversationId: string): AiAppointmentDraft | null =>
      (isActiveAiDraft(activeDraft) ? activeDraft : null) ??
      resolveLatestAiDraft(conversationsRef.current.find((c) => c.id === conversationId)?.messages ?? []),
    [activeDraft, conversationsRef],
  );

  const restoreDraft = useCallback((serverDraft: AiAppointmentDraft | null | undefined, conv: PatientAiConversation) => {
    setActiveDraft(isActiveAiDraft(serverDraft) ? serverDraft : resolveLatestAiDraft(conv.messages));
  }, []);

  /** Après une réponse : rattache le brouillon renvoyé au dernier message assistant et y joint le document envoyé. */
  const applyAssistantDraft = useCallback(
    async (conversationId: string, payload: AiChatResponse, attachment?: PatientAiChatAttachment) => {
      let draft: AiAppointmentDraft | null = payload.draft ?? payload.message.metadata?.draft ?? null;
      if (!draft?.id) return;
      if (!draft.recap) {
        try {
          const detail = await fetchAiConversationDetail(conversationId, { limit: 1 });
          if (detail.draft?.id) draft = detail.draft;
        } catch (e) {
          console.warn('[cary-ai] récapitulatif du brouillon indisponible', e);
        }
      }
      const resolved = draft;
      setActiveDraft(isActiveAiDraft(resolved) ? resolved : null);
      setConversations((prev) =>
        updateConversation(prev, conversationId, (c) => {
          const messages = [...c.messages];
          for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (message?.role !== 'assistant') continue;
            messages[i] = { ...message, metadata: { ...message.metadata, draft: resolved } };
            break;
          }
          return { ...c, messages };
        }),
      );
      if (!attachment?.medicalDocumentId) return;
      try {
        setActiveDraft(
          await attachDocumentToAiDraft(
            resolved.id,
            attachment.documentType ?? 'other',
            attachment.medicalDocumentId,
            attachment.fileName,
          ),
        );
      } catch (e) {
        console.warn('[cary-ai] document non rattaché au brouillon', e);
        showToast("Le document n'a pas pu être ajouté à la demande.", { type: 'error' });
      }
    },
    [setConversations, showToast],
  );

  /** `beforeSubmit` : après les contrôles locaux, juste avant l'appel (ex. fermer le mode vocal). */
  const confirmDraft = useCallback(
    async (draftOverride?: AiAppointmentDraft, beforeSubmit?: () => Promise<void>) => {
      if (confirmInFlight.current) return;
      const draft = draftOverride ?? draftOf(activeId);
      if (!draft) {
        showToast('Aucune demande à confirmer.', { type: 'error' });
        return;
      }
      if (draft.status !== 'ready' && draft.status !== 'confirmed') {
        const hint = draft.missing_fields?.length
          ? `À compléter : ${draft.missing_fields.join(', ')}`
          : 'Complétez la demande avec Cary avant de la confirmer.';
        showToast(hint, { type: 'info' });
        return;
      }
      if (consentRequired && consent.checked !== draft.id) {
        setConsent({ checked: null, error: draft.id });
        showToast(STAFF_PATIENT_BOOKING_CONSENT_ERROR, { type: 'error' });
        return;
      }
      confirmInFlight.current = true;
      setConfirmingDraft(true);
      const conversationId = activeId;
      try {
        await beforeSubmit?.();
        const result = await confirmAiBookingDraft(draft.id, consentRequired ? { patient_booking_consent: true } : undefined);
        const ids = result.appointment_ids?.length ? result.appointment_ids : [result.appointment_id];
        setConversations((prev) =>
          updateConversation(prev, conversationId, (c) => ({
            ...c,
            messages: [
              ...patchMessageDraft(c.messages, draft.id, result.draft),
              {
                id: `local-success-${draft.id}`,
                role: 'assistant' as const,
                text:
                  ids.length > 1
                    ? `Vos ${ids.length} rendez-vous ont été créés.`
                    : 'Votre demande de rendez-vous a été créée.',
              },
            ],
            updatedAt: Date.now(),
          })),
        );
        setActiveDraft(null);
        const appointmentId = ids[0];
        if (appointmentId) router.push(appointmentDetailHref(roleRoutePrefix(role), appointmentId));
      } catch (e) {
        setConversations((prev) =>
          appendMessage(prev, conversationId, {
            id: `local-error-${Date.now()}`,
            role: 'assistant',
            text: apiErrorMessage(e, aiBookingDraftErrorMessage, 'Impossible de confirmer la demande.'),
          }),
        );
        if (e instanceof ApiRequestError && isAiDraftClosedError(e.code)) {
          setActiveDraft(null);
          onDraftClosed(conversationId);
        }
        if (e instanceof ApiRequestError && isPatientBookingConsentRequired(e.status, e.code)) {
          setConsent({ checked: null, error: draft.id });
        }
      } finally {
        confirmInFlight.current = false;
        setConfirmingDraft(false);
      }
    },
    [activeId, consent.checked, consentRequired, draftOf, onDraftClosed, role, setConversations, showToast],
  );

  const syncVoiceDraft = useCallback((draft: AiAppointmentDraft | null) => {
    if (isActiveAiDraft(draft)) setActiveDraft(draft);
  }, []);

  const openCreatedAppointment = useCallback(
    (appointmentId: string) => {
      setActiveDraft(null);
      router.push(appointmentDetailHref(roleRoutePrefix(role), appointmentId));
    },
    [role],
  );

  return {
    activeDraft,
    setActiveDraft,
    confirmingDraft,
    bookingConsent,
    draftOf,
    restoreDraft,
    applyAssistantDraft,
    confirmDraft,
    syncVoiceDraft,
    openCreatedAppointment,
  };
}
