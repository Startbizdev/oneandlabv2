import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { appointmentTimeFrance } from '@oneandlab/shared-utils';
import type { AppointmentConversationMessage } from '@oneandlab/shared-types';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { Row } from '@/components/layout/primitives';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Send } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { pickCarePhoto } from '@/lib/uploads/pick-care-photo';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import { ScreenKeyboardAvoidingView } from '@/components/navigation/ScreenFrame';
import {
  fetchAppointmentConversation,
  postAppointmentConversationAttachment,
  postAppointmentConversationMessage,
} from '../detail/api/conversation.service';
import {
  ATTACHMENT_PLACEHOLDER_BODY,
  ConversationMessageBubble,
  conversationAttachmentLink,
  type ConversationAttachmentLink,
} from '../detail/components/conversation/ConversationMessageBubble';
import {
  ConversationDaySeparator,
  withConversationDaySeparators,
} from '../detail/components/conversation/ConversationDaySeparator';
import { useLeaveConversation } from '../detail/hooks/use-leave-conversation';
import { ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, radius, spacing, iconSize, useStyles, type Theme } from '@/theme';

type OutboxMessage = {
  localId: string;
  body: string;
  created_at: string;
  status: 'sending' | 'failed';
};

type ThreadEntry =
  | { source: 'server'; created_at: string; message: AppointmentConversationMessage }
  | { source: 'outbox'; created_at: string; message: OutboxMessage };

type SendPayload = {
  body: string;
  file?: { uri: string; name: string; type: string };
  localId?: string;
};

export function AppointmentConversationScreen() {
  const { id, messageId, fromNotification } = useLocalSearchParams<{
    id: string;
    messageId?: string;
    fromNotification?: string;
  }>();
  const appointmentId = String(id ?? '');
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const userId = useAuthStore((s) => s.user?.id);
  const userRole = useAuthStore((s) => s.user?.role);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [draft, setDraft] = useState('');
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const leaveConversation = useLeaveConversation(appointmentId, userRole, fromNotification);
  const focused = useIsFocused();
  const appActive = useAppActive();
  const { footerPadding } = useSceneBottomInset();

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: queryKeys.appointments.conversation(appointmentId),
    queryFn: async () => {
      const res = await fetchAppointmentConversation(appointmentId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: !!appointmentId,
    refetchInterval: focusedRefetchInterval(15000, focused, appActive),
    refetchIntervalInBackground: false,
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: SendPayload) => {
      const response = payload.file
        ? await postAppointmentConversationAttachment(appointmentId, payload.file, payload.body)
        : await postAppointmentConversationMessage(appointmentId, payload.body);
      if (!response.success) throw new Error(response.error ?? 'Le message n’a pas été envoyé.');
      return response;
    },
    onSuccess: async (_response, payload) => {
      await qc.invalidateQueries({ queryKey: queryKeys.appointments.conversation(appointmentId) });
      if (payload.localId) {
        setOutbox((prev) => prev.filter((m) => m.localId !== payload.localId));
      }
    },
    onError: (e, payload) => {
      if (payload.localId) {
        setOutbox((prev) =>
          prev.map((m) => (m.localId === payload.localId ? { ...m, status: 'failed' } : m)),
        );
      }
      handleApiError(e, toast, 'conversation-send');
    },
  });

  const sendText = useCallback(
    (body: string, localId: string = `local-${Date.now()}`) => {
      setOutbox((prev) => {
        const rest = prev.filter((m) => m.localId !== localId);
        return [...rest, { localId, body, created_at: new Date().toISOString(), status: 'sending' }];
      });
      sendMutation.mutate({ body, localId });
    },
    [sendMutation],
  );

  function onSubmitDraft() {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    sendText(body);
  }

  async function onPickAttachment() {
    let picked: Awaited<ReturnType<typeof pickCarePhoto>>;
    try {
      picked = await pickCarePhoto();
    } catch (e) {
      handleApiError(e, toast, 'conversation-attachment');
      return;
    }
    if (!picked) return;
    sendMutation.mutate(
      {
        body: draft.trim() || ATTACHMENT_PLACEHOLDER_BODY,
        file: { uri: picked.uri, name: picked.fileName, type: picked.mimeType ?? 'image/jpeg' },
      },
      { onSuccess: () => setDraft('') },
    );
  }

  const messages = useMemo(() => data?.messages ?? [], [data?.messages]);
  const canPost = Boolean(data?.can_post);

  const threadItems = useMemo(() => {
    const entries: ThreadEntry[] = [
      ...messages.map((message): ThreadEntry => ({ source: 'server', created_at: message.created_at, message })),
      ...outbox.map((message): ThreadEntry => ({ source: 'outbox', created_at: message.created_at, message })),
    ];
    return withConversationDaySeparators(entries, (entry) =>
      entry.source === 'server' ? entry.message.id : entry.message.localId,
    );
  }, [messages, outbox]);

  const title = useMemo(() => {
    if (userRole !== 'patient') return undefined;
    return messages.find((message) => message.author_id !== userId)?.author_name?.trim() || undefined;
  }, [messages, userId, userRole]);

  const threadLength = threadItems.length;
  useEffect(() => {
    if (!threadLength) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(timer);
  }, [messageId, threadLength]);

  async function openAttachment(link: ConversationAttachmentLink) {
    setOpeningDocumentId(link.documentId);
    try {
      const result = await openMedicalDocument(link.documentId, link.openFileName);
      if (!result.ok) toast(result.error ?? 'Ouverture impossible', { type: 'error' });
    } catch (openError) {
      handleApiError(openError, toast, 'conversation-open-attachment');
    } finally {
      setOpeningDocumentId(null);
    }
  }

  const canSend = Boolean(draft.trim());

  return (
    <StackChromeScreen title={title}>
    <ScreenKeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={c.primary} />
      ) : !data && error ? (
        <View style={styles.errorState}>
          <ErrorState error={error} title="Messages indisponibles" onRetry={() => void refetch()} />
          <Button title="Retour au rendez-vous" variant="ghost" onPress={leaveConversation} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.list, !threadLength && styles.listEmpty]}
          keyboardShouldPersistTaps="handled"
        >
          {!threadLength ? (
            <EmptyState
              illustration="messages"
              title="Aucun message"
              description={canPost ? 'Écrivez un message ou joignez une photo.' : undefined}
            />
          ) : null}
          {threadItems.map((item) => {
            if (item.kind === 'day') return <ConversationDaySeparator key={item.key} label={item.label} />;
            const entry = item.message;
            if (entry.source === 'outbox') {
              const pending = entry.message;
              return (
                <ConversationMessageBubble
                  key={item.key}
                  authorName="Vous"
                  body={pending.body}
                  time=""
                  mine
                  status={pending.status}
                  onRetry={() => sendText(pending.body, pending.localId)}
                  onDiscard={() => setOutbox((prev) => prev.filter((m) => m.localId !== pending.localId))}
                />
              );
            }
            const msg = entry.message;
            return (
              <ConversationMessageBubble
                key={item.key}
                authorName={msg.author_name || 'Utilisateur'}
                body={msg.body}
                time={appointmentTimeFrance(msg.created_at)}
                mine={msg.author_id === userId}
                attachment={conversationAttachmentLink(msg)}
                openingDocumentId={openingDocumentId}
                onOpenAttachment={(link) => void openAttachment(link)}
              />
            );
          })}
        </ScrollView>
      )}
      {canPost ? (
        <View style={[styles.composer, { paddingBottom: Math.max(footerPadding, spacing[3]) }]}>
          <Row style={styles.composerBar}>
            <Pressable onPress={() => void onPickAttachment()} disabled={sendMutation.isPending}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
              accessibilityRole="button" accessibilityLabel="Joindre une photo ou un document">
              <Paperclip size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
            </Pressable>
            <TextInput value={draft} onChangeText={setDraft} placeholder="Écrire un message…"
              placeholderTextColor={c.textTertiary} accessibilityLabel="Votre message"
              multiline maxLength={2000} style={styles.composerInput} />
            <Pressable onPress={onSubmitDraft}
              disabled={!canSend}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
              accessibilityRole="button" accessibilityLabel="Envoyer le message">
              <Send size={iconSize.md} color={canSend ? c.primary : c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
            </Pressable>
          </Row>
        </View>
      ) : null}
    </ScreenKeyboardAvoidingView>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    root: { flex: 1, minWidth: 0, backgroundColor: c.background },
    loader: { marginTop: spacing[8] },
    errorState: { paddingHorizontal: spacing[4], gap: spacing[2] },
    list: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[24] },
    listEmpty: { flexGrow: 1, minWidth: 0, justifyContent: 'center' as const },
    composer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      backgroundColor: c.surface,
      padding: spacing[3],
    },
    composerBar: {
      minHeight: MIN_TOUCH_TARGET + spacing[1],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      padding: spacing[0.5],
    },
    composerInput: {
      flex: 1,
      minWidth: 0,
      maxHeight: spacing[24],
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[2],
      ...text.body,
      color: c.textPrimary,
      textAlignVertical: 'center' as const,
    },
    iconButton: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconPressed: { backgroundColor: c.surfaceAlt },
  } satisfies Parameters<typeof StyleSheet.create>[0];
}
