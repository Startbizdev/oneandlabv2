import { useAppColors } from '@/theme/use-app-colors';
import type { UserRole } from '@oneandlab/shared-types';
import type { FlashListRef } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { ErrorState } from '@/components/ui/ErrorState';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { CaryAiSendFailureNotice } from '../components/CaryAiSendFailureNotice';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import {
  PatientAiChatFooter,
  PATIENT_AI_FOOTER_HEIGHT_WITH_DISCLAIMER,
  patientAiChatListBottomPadding,
} from '../components/PatientAiChatFooter';
import { PatientAiAttachmentThumbnail } from '../components/PatientAiAttachmentThumbnail';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import { PatientAiConversationsSheet } from '../components/PatientAiConversationsSheet';
import { PatientAiVoiceOverlay } from '../components/PatientAiVoiceOverlay';
import { useVoiceSession } from '../hooks/use-voice-session';
import { CaryMarkdown } from '../components/CaryMarkdown';
import { CaryAiBookingRecapCard } from '../components/CaryAiBookingRecapCard';
import { canBookWithCaryAi } from '../utils/ai-booking-access';
import { Button } from '@/components/ui/Button';
import { bookingNewHref } from '@/navigation/role-hrefs';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import { useRouter } from 'expo-router';
import { resolveAssistantMessageText } from '../utils/resolve-assistant-message-text';
import { stripDisclaimerFromAssistantText } from '../utils/strip-disclaimer-from-text';
import { CaryAiChatList } from '../components/CaryAiChatList';
import { resolveMessageRecap } from '../utils/resolve-message-recap';
import { draftPendingUploadType } from '../utils/should-show-ai-draft-documents';
import { useCaryAiHub, type CaryAiHubInit } from '../hooks/use-cary-ai-hub';
import { useAuthStore } from '@/store/auth-store';
import { searchAiConversations } from '../api/ai.service';
import { useCaryAiChatScroll } from '../hooks/use-cary-ai-chat-scroll';
import type { PatientAiChatAttachment, PatientAiChatMessage } from '../types/patient-ai-conversation';
import {
  cacheMedicalDocument,
  getCachedMedicalDocumentUri,
} from '@/lib/downloads/download-medical-document';
import type { AiQuickSuggestion } from '@oneandlab/shared-types';
import {
  H_PADDING,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  AppText,
  useStyles,
  type Theme,
  ICON_STROKE_WIDTH,
} from '@/theme';

type ScreenStyles = ReturnType<typeof buildStyles>;

interface ScreenProps {
  role: UserRole | string;
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  init?: CaryAiHubInit;
}

function SuggestionList({
  styles,
  suggestions,
  onPick,
}: {
  styles: ScreenStyles;
  suggestions: AiQuickSuggestion[];
  onPick?: (item: AiQuickSuggestion) => void;
}) {
  const c = useAppColors();
  return (
    <View style={styles.suggestions}>
      {suggestions.map((item) => (
        <Pressable
          key={item.id}
          onPress={onPick ? () => onPick(item) : undefined}
          disabled={!onPick}
          style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
          accessibilityRole="button"
        >
          <AppText variant="body" style={styles.suggestionLabel}>
            {item.label}
          </AppText>
          <ArrowUpRight size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      ))}
    </View>
  );
}

function MessageBubble({
  styles,
  message,
  welcome,
  suggestions,
  onSuggestionPick,
  disclaimer,
  recapSlot,
  actionSlot,
  onAttachmentPress,
}: {
  styles: ScreenStyles;
  message: PatientAiChatMessage;
  welcome?: boolean;
  suggestions?: AiQuickSuggestion[];
  onSuggestionPick?: (item: AiQuickSuggestion) => void;
  disclaimer?: string;
  recapSlot?: ReactNode;
  actionSlot?: ReactNode;
  onAttachmentPress?: (attachment: PatientAiChatAttachment) => void;
}) {
  const isUser = message.role === 'user';
  const attachment = message.metadata?.attachment;

  if (isUser) {
    const mediaOnly = Boolean(attachment) && !message.text;
    return (
      <Row justify="end" style={styles.userRow}>
        <View style={[styles.bubbleUser, mediaOnly ? styles.bubbleUserMediaOnly : null]}>
          {attachment ? (
            <PatientAiAttachmentThumbnail
              attachment={attachment}
              variant="message"
              compact={mediaOnly}
              onPress={
                onAttachmentPress
                  ? () => onAttachmentPress(attachment)
                  : undefined
              }
            />
          ) : null}
          {message.text ? <CaryMarkdown text={message.text} /> : null}
        </View>
      </Row>
    );
  }

  const assistantText = stripDisclaimerFromAssistantText(message.text, disclaimer);
  const visibleAssistantText =
    assistantText ||
    (recapSlot ? 'Voici le récapitulatif de votre demande.' : '') ||
    resolveAssistantMessageText(message.text, '');
  return (
    <View style={styles.assistant}>
      {visibleAssistantText ? <CaryMarkdown text={visibleAssistantText} /> : null}
      {welcome && suggestions?.length ? (
        <SuggestionList styles={styles} suggestions={suggestions} onPick={onSuggestionPick} />
      ) : null}
      {recapSlot ? <View style={styles.recap}>{recapSlot}</View> : null}
      {actionSlot ? <View style={styles.recap}>{actionSlot}</View> : null}
    </View>
  );
}

/** Hub Cary IA branché API (Phase 1). */
export function CaryAiHubScreen({
  role,
  historyOpen,
  onHistoryOpenChange,
  init,
}: ScreenProps) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const bookingEnabled = canBookWithCaryAi(role);
  const { safeAreaBottom: bottomInset } = useSceneBottomInset();
  const listRef = useRef<FlashListRef<PatientAiChatMessage>>(null);
  const [footerHeight, setFooterHeight] = useState(PATIENT_AI_FOOTER_HEIGHT_WITH_DISCLAIMER);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const listContentStyle = useMemo(
    () => ({
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[2],
      paddingBottom:
        patientAiChatListBottomPadding(footerHeight, bottomInset) + keyboardInset,
    }),
    [footerHeight, bottomInset, keyboardInset],
  );

  const onFooterLayout = useCallback((height: number) => {
    setFooterHeight((prev) => (Math.abs(prev - height) < 2 ? prev : height));
  }, []);

  const {
    loading,
    initError,
    retryInit,
    sendFailure,
    retryFailedSend,
    editFailedSend,
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
    togglePinConversation,
    archiveConversation,
    unarchiveConversation,
    sendMessage,
    handleSuggestion,
    confirmDraft,
    reloadConversation,
    syncVoiceDraft,
    onVoiceAppointmentCreated,
    handleAttach,
    clearAttachment,
    pendingAttachment,
    attaching,
  } = useCaryAiHub(init);

  const messages = useMemo(() => activeConversation?.messages ?? [], [activeConversation?.messages]);
  const welcomeMessageId = messages[0]?.id;
  const activeSendFailure = sendFailure && sendFailure.conversationId === activeId ? sendFailure : null;
  const composerBlocked = awaitingReply || !activeId || Boolean(activeSendFailure);

  const { scrollToEnd, onContentSizeChange } = useCaryAiChatScroll(listRef, {
    messageCount: messages.length,
    streamingTextLength: streamingText.length,
    awaitingReply,
    activeId,
  });

  const recapScrollKeyRef = useRef('');
  useEffect(() => {
    const hasRecap = messages.some(
      (m) => m.role === 'assistant' && resolveMessageRecap(m) !== null,
    );
    if (!hasRecap) return;
    const key = `${messages.length}-${activeDraft?.updated_at ?? ''}-${confirmingDraft}`;
    if (recapScrollKeyRef.current === key) return;
    recapScrollKeyRef.current = key;
    scrollToEnd(true);
  }, [messages, activeDraft?.updated_at, confirmingDraft, scrollToEnd]);

  const [draft, setDraft] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ uri: string; fileName?: string } | null>(
    null,
  );
  const [convSearch, setConvSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [searchIds, setSearchIds] = useState<Set<string> | null>(null);
  const closeVoiceModeRef = useRef<(opts?: { reload?: boolean }) => Promise<void>>(async () => {});
  const voiceUserFirstName = useAuthStore((s) => s.user?.first_name ?? null);

  const voice = useVoiceSession({
    conversationId: activeId,
    userFirstName: voiceUserFirstName,
    onConversationSync: reloadConversation,
    onDraftSync: syncVoiceDraft,
    onAppointmentCreated: async (appointmentId) => {
      await closeVoiceModeRef.current({ reload: false });
      onVoiceAppointmentCreated(appointmentId);
    },
  });

  const {
    endSession: endVoiceSessionApi,
    reset: resetVoiceSession,
    stopConversation: stopVoiceConversation,
    lastConversationId: voiceLastConversationId,
  } = voice;

  const closeVoiceMode = useCallback(
    async (opts?: { reload?: boolean }) => {
      stopVoiceConversation();
      await endVoiceSessionApi();
      resetVoiceSession({ keepConversationId: true });
      setVoiceOpen(false);
      if (opts?.reload !== false) {
        const convId = voiceLastConversationId ?? activeId;
        if (convId) {
          await reloadConversation(convId);
        }
      }
    },
    [
      activeId,
      endVoiceSessionApi,
      reloadConversation,
      resetVoiceSession,
      stopVoiceConversation,
      voiceLastConversationId,
    ],
  );

  closeVoiceModeRef.current = closeVoiceMode;

  const handleVoiceClose = useCallback(async () => {
    await closeVoiceMode({ reload: true });
  }, [closeVoiceMode]);

  const handleConfirmDraft = useCallback(
    async (draft?: Parameters<typeof confirmDraft>[0]) => {
      if (voiceOpen) {
        await closeVoiceMode({ reload: true });
      }
      await confirmDraft(draft);
    },
    [closeVoiceMode, confirmDraft, voiceOpen],
  );

  const showSuggestions = messages.length <= 1 && !composerBlocked && suggestions.length > 0;
  const canSend =
    !composerBlocked &&
    !attaching &&
    (draft.trim().length > 0 || Boolean(pendingAttachment?.medicalDocumentId));

  const handleAttachmentPress = useCallback(async (attachment: PatientAiChatAttachment) => {
    let uri = attachment.uri;
    if (attachment.medicalDocumentId) {
      const cached = await getCachedMedicalDocumentUri(attachment.medicalDocumentId, attachment.fileName);
      if (cached) {
        uri = cached;
      } else {
        const downloaded = await cacheMedicalDocument(attachment.medicalDocumentId, attachment.fileName);
        if (downloaded.ok && downloaded.localUri) {
          uri = downloaded.localUri;
        }
      }
    }
    if (uri) {
      setAttachmentPreview({ uri, fileName: attachment.fileName });
    }
  }, []);

  useEffect(() => {
    setDraft('');
  }, [activeId]);

  useEffect(() => {
    const q = convSearch.trim();
    if (q.length < 2) {
      setSearchIds(null);
      return;
    }
    const timer = setTimeout(() => {
      void searchAiConversations(q)
        .then((hits) => {
          const ids = new Set<string>();
          hits.conversations.forEach((c) => ids.add(c.id));
          hits.messages.forEach((m) => ids.add(m.conversation_id));
          setSearchIds(ids);
        })
        .catch(() => setSearchIds(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [convSearch]);

  const { show: showToast } = useToast();
  const runConversationAction = useCallback(
    (action: Promise<unknown>, context: string) => {
      action.catch((e: unknown) => handleApiError(e, showToast, context));
    },
    [showToast],
  );

  useEffect(() => {
    if (historyOpen) {
      runConversationAction(refreshConversationsList(showArchived), 'ai-list-conversations');
    }
  }, [historyOpen, showArchived, refreshConversationsList, runConversationAction]);

  const sheetConversations = useMemo(() => {
    if (!searchIds) return conversations;
    return conversations.filter((c) => searchIds.has(c.id));
  }, [conversations, searchIds]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardInset > 0) {
      scrollToEnd(true);
    }
  }, [keyboardInset, scrollToEnd]);

  const handleSendText = useCallback(() => {
    if (!canSend) return;
    const text = draft;
    const attachment =
      pendingAttachment?.medicalDocumentId && !attaching ? pendingAttachment : undefined;
    setDraft('');
    scrollToEnd(true);
    void sendMessage(text, attachment ? { attachment } : undefined);
  }, [attaching, canSend, draft, pendingAttachment, scrollToEnd, sendMessage]);

  const renderMessage = useCallback(
    (item: PatientAiChatMessage) => {
      const isWelcome = item.id === welcomeMessageId && item.role === 'assistant';
      const recapState =
        bookingEnabled && item.role === 'assistant' && !awaitingReply ? resolveMessageRecap(item) : null;
      const recapSlot = recapState ? (
        <CaryAiBookingRecapCard
          draft={recapState.draft}
          canConfirm={recapState.canConfirm}
          confirming={recapState.canConfirm && confirmingDraft}
          onConfirm={(d) => void handleConfirmDraft(d)}
        />
      ) : null;
      const actionSlot =
        !bookingEnabled && isWelcome ? (
          <Button
            title="Demander un prélèvement"
            variant="secondary"
            onPress={() => router.push(bookingNewHref(roleRoutePrefix(role)))}
          />
        ) : null;

      return (
        <MessageBubble
          styles={styles}
          message={item}
          welcome={isWelcome}
          suggestions={showSuggestions && isWelcome ? suggestions : undefined}
          onSuggestionPick={showSuggestions ? handleSuggestion : undefined}
          disclaimer={disclaimer}
          recapSlot={recapSlot}
          actionSlot={actionSlot}
          onAttachmentPress={handleAttachmentPress}
        />
      );
    },
    [
      styles,
      welcomeMessageId,
      showSuggestions,
      suggestions,
      handleSuggestion,
      disclaimer,
      awaitingReply,
      bookingEnabled,
      confirmingDraft,
      handleConfirmDraft,
      handleAttachmentPress,
      role,
      router,
    ],
  );

  const handleComposerAttachmentPress = useCallback(() => {
    if (!pendingAttachment?.uri) return;
    setAttachmentPreview({
      uri: pendingAttachment.uri,
      fileName: pendingAttachment.fileName,
    });
  }, [pendingAttachment]);

  const displayStreamingText = streamingText
    ? resolveAssistantMessageText('', streamingText)
    : '';

  const listFooter = (
    <>
      {activeSendFailure ? (
        <CaryAiSendFailureNotice
          error={activeSendFailure.error}
          onRetry={retryFailedSend}
          onEdit={() => setDraft(editFailedSend())}
        />
      ) : null}
      {awaitingReply ? (
        <View style={styles.typing} accessibilityLiveRegion="polite">
          {displayStreamingText ? (
            <CaryMarkdown text={displayStreamingText} />
          ) : (
            <AppText variant="secondary">Cary réfléchit…</AppText>
          )}
        </View>
      ) : null}
    </>
  );

  if (loading && !activeConversation) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={c.primary} accessibilityLabel="Chargement de Cary" />
      </View>
    );
  }

  if (initError && !activeConversation) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ErrorState title="Cary est indisponible" error={initError} onRetry={retryInit} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.screen}>
        <CaryAiChatList
          ref={listRef}
          messages={messages}
          contentContainerStyle={listContentStyle}
          renderMessage={renderMessage}
          listFooter={listFooter}
          onContentSizeChange={onContentSizeChange}
          extraData={`${showSuggestions}-${activeId}-${awaitingReply}-${activeSendFailure?.userMessageId ?? ''}-${activeDraft?.status}-${activeDraft?.updated_at}-${messages.length}-${streamingText.length}-${confirmingDraft}`}
        />

        <PatientAiChatFooter
          draft={draft}
          onChangeDraft={setDraft}
          onSend={handleSendText}
          onVoicePress={() => setVoiceOpen(true)}
          onAttachPress={() => void handleAttach()}
          onClearAttachment={clearAttachment}
          onPreviewPress={handleComposerAttachmentPress}
          pendingAttachment={pendingAttachment}
          attaching={attaching}
          onFocusInput={() => scrollToEnd(true)}
          onFooterLayout={onFooterLayout}
          canSend={canSend}
          disabled={composerBlocked}
        />
      </View>

      <PatientAiVoiceOverlay
        visible={voiceOpen}
        onClose={() => void handleVoiceClose()}
        phase={voice.phase}
        recognizing={voice.recognizing}
        available={voice.available}
        voiceEnergy={voice.voiceEnergy}
        turns={voice.turns}
        speechError={voice.speechError}
        activeDraft={bookingEnabled ? activeDraft : null}
        confirmingDraft={confirmingDraft}
        attachingDocument={attaching}
        onConfirmDraft={bookingEnabled ? (d) => void handleConfirmDraft(d) : undefined}
        onAttachDocument={(source) =>
          void handleAttach(draftPendingUploadType(activeDraft ?? null), source)
        }
        onStart={() => void voice.startConversation()}
        onStop={voice.stopConversation}
        onInterrupt={() => void voice.interruptAssistant()}
      />

      <PatientAiConversationsSheet
        visible={historyOpen}
        onClose={() => onHistoryOpenChange(false)}
        conversations={sheetConversations}
        activeId={activeId}
        onSelectConversation={(id) => runConversationAction(selectConversation(id), 'ai-select-conversation')}
        onNewConversation={() => runConversationAction(startNewConversation(), 'ai-new-conversation')}
        onDeleteConversation={(id) => runConversationAction(deleteConversation(id), 'ai-delete-conversation')}
        onRefresh={() => runConversationAction(refreshConversationsList(showArchived), 'ai-list-conversations')}
        searchQuery={convSearch}
        onSearchChange={setConvSearch}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((v) => !v)}
        onTogglePin={(id) => runConversationAction(togglePinConversation(id), 'ai-pin-conversation')}
        onArchive={(id) => runConversationAction(archiveConversation(id), 'ai-archive-conversation')}
        onUnarchive={(id) => runConversationAction(unarchiveConversation(id), 'ai-unarchive-conversation')}
      />

      <MedicalDocumentPreviewModal
        visible={Boolean(attachmentPreview)}
        localUri={attachmentPreview?.uri ?? null}
        fileName={attachmentPreview?.fileName}
        onClose={() => setAttachmentPreview(null)}
      />
    </>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    screen: {
      minWidth: 0,
      flex: 1,
      minHeight: 0,
      position: 'relative' as const,
      backgroundColor: c.background,
    },
    centered: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    userRow: { minWidth: 0 },
    bubbleUser: {
      maxWidth: '85%' as const,
      borderRadius: radius.xl,
      borderBottomRightRadius: radius.sm,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2.5],
      backgroundColor: c.surfaceAlt,
      gap: spacing[2],
    },
    bubbleUserMediaOnly: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      maxWidth: '72%' as const,
      backgroundColor: 'transparent',
    },
    assistant: { minWidth: 0, gap: spacing[4], paddingVertical: spacing[1] },
    recap: { minWidth: 0 },
    suggestions: { gap: spacing[2] },
    suggestion: {
      minHeight: MIN_TOUCH_TARGET + spacing[1],
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2.5],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
    },
    suggestionPressed: { backgroundColor: c.surfaceAlt },
    suggestionLabel: { flex: 1, minWidth: 0 },
    typing: { paddingTop: spacing[3] },
  };
}