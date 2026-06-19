import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import type { UserRole } from '@oneandlab/shared-types';
import type { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { Smile } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import {
  PatientAiChatFooter,
  PATIENT_AI_FOOTER_HEIGHT_WITH_DISCLAIMER,
  patientAiChatListBottomPadding,
} from '../components/PatientAiChatFooter';
import { useNativeTabBarInset } from '@/navigation/use-native-tab-bar-inset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientAiConversationsSheet } from '../components/PatientAiConversationsSheet';
import { PatientAiVoiceMockOverlay } from '../components/PatientAiVoiceMockOverlay';
import { CaryMarkdown } from '../components/CaryMarkdown';
import { CaryAiBookingRecapCard } from '../components/CaryAiBookingRecapCard';
import { stripDisclaimerFromAssistantText } from '../utils/strip-disclaimer-from-text';
import { CaryAiChatList } from '../components/CaryAiChatList';
import { resolveMessageRecap } from '../utils/resolve-message-recap';
import { useCaryAiHub, type CaryAiHubInit } from '../hooks/use-cary-ai-hub';
import { useCaryAiChatScroll } from '../hooks/use-cary-ai-chat-scroll';
import type { PatientAiChatMessage } from '../types/patient-ai-conversation';
import type { AiQuickSuggestion } from '@oneandlab/shared-types';
import { useTabSceneInsets } from '@/components/navigation/liquid-glass-header-inset';
import { H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

type ScreenStyles = ReturnType<typeof buildStyles>;

interface ScreenProps {
  role: UserRole | string;
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  init?: CaryAiHubInit;
  /** false = écran stack pro/nurse/preleveur (composer collé en bas). */
  includeTabBarInset?: boolean;
}

function AssistantAvatar({ styles }: { styles: ScreenStyles }) {
  const c = useAppColors();
  return (
    <View style={[styles.avatar, { backgroundColor: c.primaryLight }]}>
      <Smile size={20} color={c.primary} strokeWidth={2} />
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
}: {
  styles: ScreenStyles;
  message: PatientAiChatMessage;
  welcome?: boolean;
  suggestions?: AiQuickSuggestion[];
  onSuggestionPick?: (item: AiQuickSuggestion) => void;
  disclaimer?: string;
  recapSlot?: ReactNode;
}) {
  const c = useAppColors();
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <Row justify="end" style={styles.userRow}>
        <View style={[styles.bubble, styles.bubbleUser, { backgroundColor: c.primary }]}>
          <CaryMarkdown text={message.text} inverse style={styles.bodyTextOnPrimary} />
        </View>
      </Row>
    );
  }

  const assistantText = stripDisclaimerFromAssistantText(message.text, disclaimer);
  const body = (
    <>
      {assistantText ? (
        <CaryMarkdown text={assistantText} style={styles.assistantText} />
      ) : null}
      {welcome && suggestions?.length ? (
        <Row wrap gap={spacing[2]} style={styles.suggestionChips}>
          {suggestions.map((item) => (
            <View key={item.id} style={styles.suggestionChipWrap}>
              <Button
                title={item.label}
                variant="outline"
                size="sm"
                onPress={onSuggestionPick ? () => onSuggestionPick(item) : undefined}
                disabled={!onSuggestionPick}
              />
            </View>
          ))}
        </Row>
      ) : null}
      {recapSlot ? <View style={styles.recapInBubble}>{recapSlot}</View> : null}
    </>
  );

  if (welcome) {
    return (
      <Row align="start" gap={spacing[2]} style={styles.assistantPlainRow}>
        <AssistantAvatar styles={styles} />
        <View style={styles.plainContent}>{body}</View>
      </Row>
    );
  }

  return (
    <Row align="end" gap={spacing[2]} style={styles.assistantRow}>
      <AssistantAvatar styles={styles} />
      <View style={[styles.bubble, styles.bubbleAssistant, styles.bubbleAssistantContent, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
        {body}
      </View>
    </Row>
  );
}

/** Hub Cary IA branché API (Phase 1). */
export function CaryAiHubScreen({
  historyOpen,
  onHistoryOpenChange,
  init,
  includeTabBarInset = true,
}: ScreenProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const sceneInsets = useTabSceneInsets();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const tabBarInset = useNativeTabBarInset(0);
  const bottomInset = includeTabBarInset ? tabBarInset : safeBottom;
  const listRef = useRef<FlashList<PatientAiChatMessage>>(null);
  const [footerHeight, setFooterHeight] = useState(PATIENT_AI_FOOTER_HEIGHT_WITH_DISCLAIMER);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const listContentStyle = useMemo(
    () => ({
      paddingHorizontal: H_PADDING,
      paddingTop: sceneInsets.insetTop + spacing[2],
      paddingBottom:
        patientAiChatListBottomPadding(footerHeight, bottomInset) + keyboardInset,
    }),
    [footerHeight, bottomInset, sceneInsets.insetTop, keyboardInset],
  );

  const onFooterLayout = useCallback((height: number) => {
    setFooterHeight((prev) => (Math.abs(prev - height) < 2 ? prev : height));
  }, []);

  const {
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
  } = useCaryAiHub(init);

  const messages = activeConversation?.messages ?? [];
  const welcomeMessageId = messages[0]?.id;

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
  const showSuggestions = messages.length <= 1 && !awaitingReply && suggestions.length > 0;
  const canSend = draft.trim().length > 0 && !awaitingReply;

  useEffect(() => {
    setDraft('');
  }, [activeId]);

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
    setDraft('');
    scrollToEnd(true);
    void sendMessage(text);
  }, [canSend, draft, scrollToEnd, sendMessage]);

  const renderMessage = useCallback(
    (item: PatientAiChatMessage) => {
      const isWelcome = item.id === welcomeMessageId && item.role === 'assistant';
      const recapState =
        item.role === 'assistant' && !awaitingReply ? resolveMessageRecap(item) : null;
      const recapSlot = recapState ? (
        <CaryAiBookingRecapCard
          draft={recapState.draft}
          canConfirm={recapState.canConfirm}
          confirming={recapState.canConfirm && confirmingDraft}
          onConfirm={(d) => void confirmDraft(d)}
          onReplaceDocument={handleReplaceDocument}
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
      confirmingDraft,
      confirmDraft,
      handleReplaceDocument,
    ],
  );

  const listFooter = (
    <>
      {awaitingReply ? (
        <Row align="end" gap={spacing[2]} style={styles.typingRow}>
          <AssistantAvatar styles={styles} />
          <View style={[styles.typingBubble, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]}>
            <Text style={[styles.typingText, { color: c.textSecondary }]}>
              {streamingText ? '' : 'Cary réfléchit…'}
            </Text>
            {streamingText ? <CaryMarkdown text={streamingText} style={styles.assistantText} /> : null}
          </View>
        </Row>
      ) : null}
    </>
  );

  if (loading && !activeConversation) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={c.primary} />
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
          extraData={`${showSuggestions}-${activeId}-${awaitingReply}-${activeDraft?.status}-${activeDraft?.updated_at}-${messages.length}-${streamingText.length}-${confirmingDraft}`}
        />

        <PatientAiChatFooter
          draft={draft}
          onChangeDraft={setDraft}
          onSend={handleSendText}
          onVoicePress={() => setVoiceOpen(true)}
          onAttachPress={() => void handleAttach()}
          onClearAttachment={clearAttachment}
          pendingAttachment={pendingAttachment}
          attaching={attaching}
          onFocusInput={() => scrollToEnd(true)}
          onFooterLayout={onFooterLayout}
          canSend={canSend}
          disabled={awaitingReply}
          disclaimer={disclaimer}
          includeTabBarInset={includeTabBarInset}
        />
      </View>

      <PatientAiVoiceMockOverlay visible={voiceOpen} onClose={() => setVoiceOpen(false)} />

      <PatientAiConversationsSheet
        visible={historyOpen}
        onClose={() => onHistoryOpenChange(false)}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => void selectConversation(id)}
        onNewConversation={() => void startNewConversation()}
        onDeleteConversation={(id) => void deleteConversation(id)}
        onRefresh={refreshConversationsList}
      />
    </>
  );
}

function buildStyles(c: AppColors) {
  const userBodySize = fontSize.sm;
  const assistantBodySize = fontSize.base;

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
    messageGap: { height: spacing[2.5] },
    assistantRow: { maxWidth: '100%' as const },
    assistantPlainRow: { maxWidth: '100%' as const },
    plainContent: { minWidth: 0, flex: 1, paddingTop: spacing[0.5] },
    bodyText: {
      fontFamily: fontFamily.regular,
      fontSize: userBodySize,
      lineHeight: lh(userBodySize, 1.4),
      color: c.textPrimary,
    },
    assistantText: {
      fontFamily: fontFamily.regular,
      fontSize: assistantBodySize,
      lineHeight: lh(assistantBodySize, 1.45),
      color: c.textPrimary,
    },
    bodyTextOnPrimary: { color: c.textInverse },
    suggestionChips: { marginTop: spacing[2] },
    suggestionChipWrap: { flexShrink: 0, maxWidth: '100%' as const },
    userRow: { minWidth: 0 },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    bubble: {
      maxWidth: '88%' as const,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },
    bubbleAssistant: {
      borderWidth: StyleSheet.hairlineWidth,
      borderBottomLeftRadius: radius.sm,
      minWidth: 0,
    },
    bubbleAssistantContent: {
      overflow: 'hidden' as const,
    },
    bubbleUser: { borderBottomRightRadius: radius.sm },
    typingRow: { paddingTop: spacing[1] },
    recapInBubble: {
      marginTop: spacing[2],
    },
    typingBubble: {
      borderRadius: radius.lg,
      borderBottomLeftRadius: radius.sm,
      borderWidth: 1,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      maxWidth: '88%' as const,
    },
    typingText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      fontStyle: 'italic' as const,
    },
  };
}
