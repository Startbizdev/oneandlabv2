import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { Smile } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import {
  PATIENT_AI_FOOTER_HEIGHT_WITH_BANNER,
  PatientAiChatFooter,
} from '../components/PatientAiChatFooter';
import { PatientAiConversationsSheet } from '../components/PatientAiConversationsSheet';
import { PatientAiVoiceOverlay } from '../components/PatientAiVoiceOverlay';
import { useVoiceSession } from '../hooks/use-voice-session';
import { usePatientAiConversations, nextPatientAiMessageId } from '../hooks/use-patient-ai-conversations';
import { useAuthStore } from '@/store/auth-store';
import {
  pickPatientAiMockReply,
  PATIENT_AI_QUICK_SUGGESTIONS,
  type PatientAiQuickSuggestion,
} from '../constants/patient-ai-mock';
import type { PatientAiChatMessage } from '../types/patient-ai-conversation';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

type ScreenStyles = ReturnType<typeof buildStyles>;

interface ScreenProps {
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
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
}: {
  styles: ScreenStyles;
  message: PatientAiChatMessage;
  welcome?: boolean;
  suggestions?: PatientAiQuickSuggestion[];
  onSuggestionPick?: (item: PatientAiQuickSuggestion) => void;
}) {
  const c = useAppColors();
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <Row justify="end" style={styles.userRow}>
        <View style={[styles.bubble, styles.bubbleUser, { backgroundColor: c.primary }]}>
          <Text style={[styles.bodyText, styles.bodyTextOnPrimary]}>{message.text}</Text>
        </View>
      </Row>
    );
  }

  if (welcome) {
    return (
      <Row align="start" gap={spacing[2]} style={styles.assistantPlainRow}>
        <AssistantAvatar styles={styles} />
        <View style={styles.plainContent}>
          <Text style={styles.assistantText}>{message.text}</Text>
          {suggestions?.length ? (
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
        </View>
      </Row>
    );
  }

  return (
    <Row align="end" gap={spacing[2]} style={styles.assistantRow}>
      <AssistantAvatar styles={styles} />
      <View
        style={[
          styles.bubble,
          styles.bubbleAssistant,
          { backgroundColor: c.surface, borderColor: c.borderLight },
        ]}
      >
        <Text style={styles.assistantText}>{message.text}</Text>
      </View>
    </Row>
  );
}

function ListSeparator({ styles }: { styles: ScreenStyles }) {
  return <View style={styles.messageGap} />;
}

/** Mock hub conversationnel Cary IA (Phase B — pas de backend). */
export function PatientAiMockScreen({ historyOpen, onHistoryOpenChange }: ScreenProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.listContent, {
    extraBottom: PATIENT_AI_FOOTER_HEIGHT_WITH_BANNER + spacing[2],
  });
  const listRef = useRef<FlatList<PatientAiChatMessage>>(null);
  const user = useAuthStore((s) => s.user);
  const firstName = user?.first_name?.trim() ?? '';

  const {
    conversations,
    activeConversation,
    activeId,
    setActiveMessages,
    patchActiveConversation,
    selectConversation,
    startNewConversation,
  } = usePatientAiConversations(firstName);

  const messages = activeConversation.messages;
  const [draft, setDraft] = useState('');
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const voice = useVoiceSession({ conversationId: activeId, userFirstName: firstName });

  const voiceTurnsRef = useRef(voice.turns);
  voiceTurnsRef.current = voice.turns;

  const {
    endSession: endVoiceSessionApi,
    reset: resetVoiceSession,
  } = voice;

  const handleVoiceClose = useCallback(async () => {
    await endVoiceSessionApi();
    const convTurns = voiceTurnsRef.current;
    if (convTurns.length > 0) {
      setActiveMessages((prev) => [
        ...prev,
        ...convTurns.map((t) => ({
          id: nextPatientAiMessageId(),
          role: t.role,
          text: t.text,
        })),
      ]);
    }
    resetVoiceSession({ keepConversationId: true });
    setVoiceOpen(false);
  }, [endVoiceSessionApi, resetVoiceSession, setActiveMessages]);
  const showSuggestions = messages.length === 1 && !awaitingReply;
  const canSend = draft.trim().length > 0 && !awaitingReply;

  useEffect(() => {
    setDraft('');
    setAwaitingReply(false);
  }, [activeId]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const pushExchange = useCallback(
    (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || awaitingReply) return;

      setAwaitingReply(true);
      setDraft('');

      const userMsg: PatientAiChatMessage = {
        id: nextPatientAiMessageId(),
        role: 'user',
        text: trimmed,
      };

      if (activeConversation.title === 'Nouvelle conversation') {
        patchActiveConversation({ title: trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed });
      }

      setActiveMessages((prev) => [...prev, userMsg]);
      scrollToEnd();

      setTimeout(() => {
        setActiveMessages((prev) => [
          ...prev,
          {
            id: nextPatientAiMessageId(),
            role: 'assistant',
            text: pickPatientAiMockReply(),
          },
        ]);
        setAwaitingReply(false);
        scrollToEnd();
      }, 450);
    },
    [activeConversation.title, awaitingReply, patchActiveConversation, scrollToEnd, setActiveMessages],
  );

  const handleSuggestion = useCallback(
    (item: PatientAiQuickSuggestion) => {
      if (!showSuggestions) return;
      pushExchange(item.label);
    },
    [pushExchange, showSuggestions],
  );

  const handleSendText = useCallback(() => {
    if (!canSend) return;
    pushExchange(draft);
  }, [canSend, draft, pushExchange]);

  const renderItem: ListRenderItem<PatientAiChatMessage> = ({ item, index }) => (
    <MessageBubble
      styles={styles}
      message={item}
      welcome={item.role === 'assistant' && index === 0}
      suggestions={showSuggestions && index === 0 ? PATIENT_AI_QUICK_SUGGESTIONS : undefined}
      onSuggestionPick={showSuggestions ? handleSuggestion : undefined}
    />
  );

  const ListFooter = awaitingReply ? (
    <Row align="end" gap={spacing[2]} style={styles.typingRow}>
      <AssistantAvatar styles={styles} />
      <View style={[styles.typingBubble, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]}>
        <Text style={[styles.typingText, { color: c.textSecondary }]}>Cary réfléchit…</Text>
      </View>
    </Row>
  ) : null;

  return (
    <>
      <View style={styles.screen}>
        <FlatList
          ref={listRef}
          style={styles.list}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          extraData={`${showSuggestions}-${activeId}`}
          ItemSeparatorComponent={() => <ListSeparator styles={styles} />}
          {...spreadTabSceneScrollProps(scrollConfig)}
          contentContainerStyle={scrollConfig.contentContainerStyle}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={ListFooter}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
        />

        <PatientAiChatFooter
          draft={draft}
          onChangeDraft={setDraft}
          onSend={handleSendText}
          onVoicePress={() => setVoiceOpen(true)}
          onFocusInput={scrollToEnd}
          canSend={canSend}
          disabled={awaitingReply}
        />
      </View>

      <PatientAiVoiceOverlay
        visible={voiceOpen}
        onClose={() => void handleVoiceClose()}
        phase={voice.phase}
        recognizing={voice.recognizing}
        available={voice.available}
        liveTranscript={voice.liveTranscript}
        turns={voice.turns}
        lastUserText={voice.lastUserText}
        lastResponse={voice.lastResponse}
        speechError={voice.speechError}
        onStart={() => void voice.startConversation()}
        onStop={voice.stopConversation}
      />

      <PatientAiConversationsSheet
        visible={historyOpen}
        onClose={() => onHistoryOpenChange(false)}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={selectConversation}
        onNewConversation={startNewConversation}
      />
    </>
  );
}

function buildStyles(c: AppColors) {
  const userBodySize = fontSize.base;
  const userBodyLine = lh(userBodySize);
  const assistantBodySize = fontSize.lg;
  const assistantBodyLine = lh(assistantBodySize, 1.45);

  return {
    screen: {
      minWidth: 0,
      flex: 1,
      minHeight: 0,
      position: 'relative' as const,
    },
    list: { minWidth: 0, flex: 1 },
    listContent: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[2],
      paddingBottom: spacing[4],
    },
    messageGap: {
      height: spacing[3],
    },
    assistantRow: {
      maxWidth: '100%' as const,
    },
    assistantPlainRow: {
      maxWidth: '100%' as const,
    },
    plainContent: {
      minWidth: 0,
      flex: 1,
      paddingTop: spacing[1],
    },
    bodyText: {
      fontFamily: fontFamily.regular,
      fontSize: userBodySize,
      lineHeight: userBodyLine,
      color: c.textPrimary,
    },
    assistantText: {
      fontFamily: fontFamily.medium,
      fontSize: assistantBodySize,
      lineHeight: assistantBodyLine,
      color: c.textPrimary,
    },
    bodyTextOnPrimary: {
      color: c.textInverse,
    },
    suggestionChips: {
      marginTop: spacing[2.5],
    },
    suggestionChipWrap: {
      flexShrink: 0,
      maxWidth: '100%' as const,
    },
    userRow: {
      minWidth: 0,
    },
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
      borderRadius: radius.xl,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    bubbleAssistant: {
      borderWidth: 1,
      borderBottomLeftRadius: radius.sm,
    },
    bubbleUser: {
      borderBottomRightRadius: radius.sm,
    },
    typingRow: {
      paddingTop: spacing[1],
    },
    typingBubble: {
      borderRadius: radius.xl,
      borderBottomLeftRadius: radius.sm,
      borderWidth: 1,
      paddingHorizontal: spacing[3.5],
      paddingVertical: spacing[2.5],
    },
    typingText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.base,
      fontStyle: 'italic' as const,
    },
  };
}
