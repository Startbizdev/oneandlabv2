import type { MobileRole } from '@oneandlab/shared-constants';
import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import type { FlashListRef } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View, type TextInput } from 'react-native';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { appointmentDetailHref, bookingNewHref } from '@/navigation/role-hrefs';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import { useToast } from '@/providers/ToastProvider';
import { H_PADDING, spacing, useStyles, type Theme } from '@/theme';
import type { CarePhotoPickSource } from '@/lib/uploads/pick-care-photo';
import { useAppColors } from '@/theme/use-app-colors';
import { CaryAiChatList } from '../components/CaryAiChatList';
import { CaryAiContextBar } from '../components/CaryAiContextBar';
import { CaryAiEmergencyBanner } from '../components/CaryAiEmergency';
import { CaryAiInitState } from '../components/CaryAiInitState';
import { CaryAiScrollToBottomButton } from '../components/CaryAiScrollToBottomButton';
import { CaryAiStreamingReply } from '../components/CaryAiStreamingReply';
import { CaryAiSuggestionList } from '../components/CaryAiSuggestionList';
import { CaryAiSendFailureNotice } from '../components/CaryAiSendFailureNotice';
import { CaryAiThreadItem } from '../components/CaryAiThreadItem';
import { PatientAiChatFooter } from '../components/PatientAiChatFooter';
import { PatientAiConversationsSheet } from '../components/PatientAiConversationsSheet';
import { PatientAiVoiceOverlay } from '../components/PatientAiVoiceOverlay';
import { useCaryAiChatScroll } from '../hooks/use-cary-ai-chat-scroll';
import { useCaryAiHistory } from '../hooks/use-cary-ai-history';
import { useCaryAiHub } from '../hooks/use-cary-ai-hub';
import { useCaryAiResourceOpener } from '../hooks/use-cary-ai-resource-opener';
import { useCaryAiVoiceMode } from '../hooks/use-cary-ai-voice-mode';
import type { PatientAiChatMessage } from '../types/patient-ai-conversation';
import { canBookWithCaryAi } from '../utils/ai-booking-access';
import { aiActionErrorMessage, AI_MESSAGE_MAX_LENGTH } from '../utils/ai-chat-errors';
import type { AiConversationContext } from '../utils/ai-conversation-context';
import { assistantMessageDisplayText } from '../utils/ai-message-display';
import type { AiPromptSuggestion } from '../utils/ai-starter-suggestions';
import { copyToClipboard } from '../utils/copy-to-clipboard';
import { draftPendingUploadType } from '../utils/should-show-ai-draft-documents';

interface Props {
  role: MobileRole;
  context: AiConversationContext;
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  /** Retire l'objet des paramètres de route : retour à la conversation générale. */
  onClearContext: () => void;
  onPickPatient: (patientId: string) => void;
}

/** Assistant Cary : une conversation par objet (RDV, résultat, patient), réponses en direct, voix. */
export function CaryAiHubScreen({ role, context, historyOpen, onHistoryOpenChange, onClearContext, onPickPatient }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { show: showToast } = useToast();
  const bookingEnabled = canBookWithCaryAi(role);
  const hub = useCaryAiHub({ role, context });
  const { activeId, awaitingReply, disclaimer, sendMessage } = hub;
  const listRef = useRef<FlashListRef<PatientAiChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const [draftState, setDraftState] = useState({ conversationId: '', text: '' });
  const draft = draftState.conversationId === activeId ? draftState.text : '';
  const setDraft = useCallback((text: string) => setDraftState({ conversationId: activeId, text }), [activeId]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const scroll = useCaryAiChatScroll(listRef, activeId);
  const { scrollToEnd } = scroll;
  const resources = useCaryAiResourceOpener(role);
  const voiceMode = useCaryAiVoiceMode({
    activeId,
    reloadConversation: hub.reloadConversation,
    syncVoiceDraft: hub.syncVoiceDraft,
    openCreatedAppointment: hub.openCreatedAppointment,
  });
  const history = useCaryAiHistory({ open: historyOpen, ...hub });

  const messages = useMemo(() => hub.activeConversation?.messages ?? [], [hub.activeConversation?.messages]);
  const hasUserMessage = messages.some((m) => m.role === 'user');
  const lastId = messages[messages.length - 1]?.id;
  const sendFailure = hub.sendFailure?.conversationId === activeId ? hub.sendFailure : null;
  const tooLong = draft.trim().length > AI_MESSAGE_MAX_LENGTH;
  const composerDisabled = !activeId || Boolean(sendFailure);
  const pendingAttachment = hub.pendingAttachment?.medicalDocumentId && !hub.attaching ? hub.pendingAttachment : null;
  const canSend =
    !composerDisabled && !awaitingReply && !hub.attaching && !tooLong && (draft.trim().length > 0 || Boolean(pendingAttachment));
  const objectContext = hub.inContext && context.kind === 'object' ? context : null;

  const reportError = useCallback(
    (e: unknown, fallback: string) => {
      console.warn('[cary-ai]', fallback, e);
      showToast(aiActionErrorMessage(e, fallback), { type: 'error' });
    },
    [showToast],
  );

  const handleSend = () => {
    if (!canSend) return;
    const text = draft;
    setDraft('');
    if (pendingAttachment) hub.clearAttachment();
    scrollToEnd(true);
    void sendMessage(text, pendingAttachment ? { attachment: pendingAttachment } : undefined);
  };

  const pickSuggestion = useCallback(
    (suggestion: AiPromptSuggestion) => {
      scrollToEnd(true);
      void sendMessage(suggestion.message);
    },
    [scrollToEnd, sendMessage],
  );

  const copyMessage = useCallback(
    (message: PatientAiChatMessage) => {
      void copyToClipboard(assistantMessageDisplayText(message.text, disclaimer)).then((copied) =>
        showToast(copied ? 'Réponse copiée' : 'Copie impossible.', { type: copied ? 'success' : 'error' }),
      );
    },
    [disclaimer, showToast],
  );

  const editRecapRow = useCallback(
    (label: string) => {
      setDraft(`Modifier « ${label} » : `);
      inputRef.current?.focus();
    },
    [setDraft],
  );

  const { voiceOpen, closeVoiceMode } = voiceMode;
  const { confirmDraft } = hub;
  const handleConfirmDraft = useCallback(
    (selected?: AiAppointmentDraft) => {
      const closeVoice = () => closeVoiceMode(true).catch((e: unknown) => reportError(e, 'Conversation non rechargée.'));
      void confirmDraft(selected, voiceOpen ? closeVoice : undefined);
    },
    [closeVoiceMode, confirmDraft, reportError, voiceOpen],
  );

  const attach = (docType?: string, source?: CarePhotoPickSource) => {
    void (async () => {
      if ((await hub.handleAttach(docType, source)) !== 'patient_required') return;
      if (voiceOpen) await closeVoiceMode(true);
      setPickerOpen(true);
    })().catch((e: unknown) => reportError(e, 'Pièce jointe impossible.'));
  };

  const renderMessage = (item: PatientAiChatMessage, index: number) => (
    <CaryAiThreadItem
      message={item}
      welcome={index === 0 && item.role === 'assistant' && !hasUserMessage}
      last={item.id === lastId}
      busy={awaitingReply}
      disclaimer={disclaimer}
      bookingEnabled={bookingEnabled}
      confirmingDraft={hub.confirmingDraft}
      bookingConsent={hub.bookingConsent}
      starterSuggestions={hub.starterSuggestions}
      followUpSuggestions={hub.followUpSuggestions}
      rating={hub.ratings[item.id]}
      openingSourceKey={resources.openingSourceKey}
      onPickSuggestion={pickSuggestion}
      onCopy={copyMessage}
      onRegenerate={hub.regenerateRefusedIds.has(item.id) ? undefined : hub.regenerate}
      onRate={(id, rating) => void hub.rateMessage(id, rating)}
      onOpenSource={(source) => void resources.openSource(source)}
      onAttachmentPress={(attachment) => void resources.previewAttachment(attachment)}
      onConfirmDraft={handleConfirmDraft}
      onEditRecapRow={editRecapRow}
      onBook={() => router.push(bookingNewHref(roleRoutePrefix(role)))}
    />
  );

  const listHeader = hub.loadingOlder ? (
    <ActivityIndicator color={c.primary} style={styles.olderSpinner} accessibilityLabel="Chargement des messages précédents" />
  ) : messages.length === 0 ? (
    <CaryAiSuggestionList suggestions={hub.starterSuggestions} onPick={pickSuggestion} disabled={awaitingReply} />
  ) : null;

  const listFooter = (
    <>
      {sendFailure ? (
        <CaryAiSendFailureNotice
          error={sendFailure.error}
          onRetry={hub.retryFailedSend}
          onEdit={() => {
            const restored = hub.editFailedSend();
            if (!restored) return;
            setDraft(restored.text);
            if (restored.attachment) hub.setPendingAttachment(restored.attachment);
          }}
        />
      ) : null}
      {awaitingReply ? (
        <CaryAiStreamingReply text={hub.streamingText} emergency={hub.streamEmergency} disclaimer={disclaimer} />
      ) : null}
    </>
  );

  const body =
    !hub.activeConversation && (hub.loading || hub.initError) ? (
      <CaryAiInitState
        error={hub.loading ? null : hub.initError}
        onRetry={hub.retryInit}
        onOpenGeneral={context.kind !== 'general' ? onClearContext : undefined}
      />
    ) : (
      <>
        <View style={styles.thread}>
          <CaryAiChatList
            ref={listRef}
            messages={messages}
            contentContainerStyle={styles.listContent}
            renderMessage={renderMessage}
            listHeader={listHeader}
            listFooter={listFooter}
            onContentSizeChange={scroll.onContentSizeChange}
            onStartReached={
              hub.activeConversation?.hasMore
                ? () => void hub.loadOlderMessages().catch((e: unknown) => reportError(e, 'Messages précédents indisponibles.'))
                : undefined
            }
            extraData={[
              activeId,
              awaitingReply,
              hub.confirmingDraft,
              `${hub.bookingConsent?.checkedDraftId}:${hub.bookingConsent?.errorDraftId}`,
              hub.activeDraft?.updated_at,
              lastId,
              resources.openingSourceKey,
              Object.entries(hub.ratings).join(),
              hub.regenerateRefusedIds.size,
              hub.starterSuggestions.length,
              hub.followUpSuggestions.length,
            ].join('|')}
            {...scroll.listScrollProps}
          />
          {scroll.showScrollToBottom ? <CaryAiScrollToBottomButton onPress={() => scrollToEnd(true)} /> : null}
        </View>
        <PatientAiChatFooter
          ref={inputRef}
          draft={draft}
          onChangeDraft={setDraft}
          onSend={handleSend}
          onStop={hub.stop}
          generating={awaitingReply}
          onVoicePress={voiceMode.openVoiceMode}
          onAttachPress={() => attach()}
          onClearAttachment={hub.clearAttachment}
          onPreviewPress={() => {
            if (hub.pendingAttachment?.uri) resources.setPreview({ uri: hub.pendingAttachment.uri, fileName: hub.pendingAttachment.fileName });
          }}
          pendingAttachment={hub.pendingAttachment}
          attaching={hub.attaching}
          onFocus={() => scrollToEnd(true)}
          canSend={canSend}
          disabled={composerDisabled}
        />
      </>
    );

  return (
    <>
      <View style={styles.screen}>
        <CaryAiEmergencyBanner />
        <CaryAiContextBar
          role={role}
          context={objectContext}
          onClear={onClearContext}
          pickerOpen={pickerOpen}
          onPickerOpenChange={setPickerOpen}
          onPickPatient={onPickPatient}
          onOpenAppointment={(id) => router.push(appointmentDetailHref(roleRoutePrefix(role), id))}
        />
        {body}
      </View>

      <PatientAiVoiceOverlay
        {...voiceMode.overlayProps}
        onClose={() => void closeVoiceMode(true).catch((e: unknown) => reportError(e, 'Conversation non rechargée.'))}
        activeDraft={bookingEnabled ? hub.activeDraft : null}
        confirmingDraft={hub.confirmingDraft}
        bookingConsent={hub.bookingConsent}
        attachingDocument={hub.attaching}
        onConfirmDraft={bookingEnabled ? handleConfirmDraft : undefined}
        onAttachDocument={(source) => attach(draftPendingUploadType(hub.activeDraft ?? null), source)}
      />

      <PatientAiConversationsSheet
        visible={historyOpen}
        onClose={() => onHistoryOpenChange(false)}
        conversations={history.visibleConversations}
        activeId={activeId}
        onSelectConversation={(id) => void hub.selectConversation(id).catch((e: unknown) => reportError(e, 'Conversation indisponible.'))}
        onNewConversation={() => void hub.startNewConversation().catch((e: unknown) => reportError(e, 'Nouvelle conversation impossible.'))}
        searchQuery={history.query}
        onSearchChange={history.setQuery}
        showArchived={history.showArchived}
        onToggleArchived={history.toggleArchived}
        listError={history.listError}
        onRowAction={history.onRowAction}
        onExportAll={history.onExportAll}
      />

      <MedicalDocumentPreviewModal
        visible={Boolean(resources.preview)}
        localUri={resources.preview?.uri ?? null}
        fileName={resources.preview?.fileName}
        onClose={() => resources.setPreview(null)}
      />
    </>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    screen: { flex: 1, minWidth: 0, minHeight: 0, backgroundColor: c.background },
    thread: { flex: 1, minHeight: 0 },
    listContent: { paddingHorizontal: H_PADDING, paddingTop: spacing[2], paddingBottom: spacing[4] },
    olderSpinner: { paddingVertical: spacing[3] },
  };
}
