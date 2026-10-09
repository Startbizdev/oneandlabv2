import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenKeyboardAvoidingView } from '@/components/navigation/ScreenFrame';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, font, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { postPharmacyOrderMessage } from '../api/pharmacy-orders.service';
import { usePharmacyOrderMessages } from '../hooks/use-pharmacy-order-messages';

/** Conversation d'une commande pharmacie ; `messageId` (notification) amène au message. */
export function PharmacyOrderMessagesScreen() {
  const { id, messageId } = useLocalSearchParams<{ id: string; messageId?: string }>();
  const orderId = String(id ?? '');
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { footerPadding } = useSceneBottomInset();
  const composerInset = { paddingBottom: Math.max(footerPadding, spacing[3]) };
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const targetY = useRef<number | null>(null);
  const targetReached = useRef(false);

  const messagesQ = usePharmacyOrderMessages(orderId);
  const messages = messagesQ.data?.messages ?? [];
  const canPost = Boolean(messagesQ.data?.can_post);

  const sendMut = useMutation({
    mutationFn: async (body: string) => {
      const res = await postPharmacyOrderMessage(orderId, body);
      if (!res.success) throw new Error(res.error ?? 'Envoi impossible');
      return res.data;
    },
    onSuccess: async () => {
      setDraft('');
      await qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.messages(orderId) });
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-order-message'),
  });

  const sendDraft = () => {
    const text = draft.trim();
    if (!text || sendMut.isPending) return;
    sendMut.mutate(text);
  };

  /** Une seule fois sur le message notifié, puis toujours en bas pour les nouveaux messages. */
  const scrollToTarget = () => {
    const y = targetY.current;
    if (y != null && !targetReached.current) {
      targetReached.current = true;
      scrollRef.current?.scrollTo({ y, animated: false });
      return;
    }
    scrollRef.current?.scrollToEnd({ animated: false });
  };

  return (
    <StackChromeScreen>
      <ScreenKeyboardAvoidingView style={styles.root}>
        {messagesQ.isError && !messagesQ.data ? (
          <View style={styles.stateWrap}>
            <ErrorState title="Messages indisponibles" error={messagesQ.error} onRetry={() => void messagesQ.refetch()} />
          </View>
        ) : messagesQ.isLoading ? (
          <ActivityIndicator style={styles.loader} color={c.primary} />
        ) : messages.length === 0 ? (
          <View style={styles.stateWrap}>
            <EmptyState illustration="messages" title="Aucun message pour le moment" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.thread}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToTarget}
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                onLayout={
                  msg.id === messageId
                    ? (e) => {
                        targetY.current = e.nativeEvent.layout.y;
                      }
                    : undefined
                }
                style={[styles.bubble, msg.author_id === userId ? styles.bubbleMine : styles.bubbleOther]}
              >
                <AppText variant="caption">{msg.author_name ?? 'Utilisateur'}</AppText>
                <AppText variant="body">{msg.body}</AppText>
              </View>
            ))}
          </ScrollView>
        )}

        {messagesQ.data ? (
          canPost ? (
            <View style={[styles.composer, composerInset]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Votre message…"
                placeholderTextColor={c.textTertiary}
                style={styles.input}
                multiline
                accessibilityLabel="Votre message"
              />
              <Pressable
                onPress={sendDraft}
                disabled={!draft.trim() || sendMut.isPending}
                style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Envoyer"
              >
                {sendMut.isPending ? (
                  <ActivityIndicator color={c.onPrimary} size="small" />
                ) : (
                  <Send size={iconSize.md} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                )}
              </Pressable>
            </View>
          ) : (
            <View style={[styles.composerClosed, composerInset]}>
              <AppText variant="secondary" style={styles.composerClosedText}>
                Conversation fermée pour cette commande.
              </AppText>
            </View>
          )
        ) : null}
      </ScreenKeyboardAvoidingView>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: { flex: 1, backgroundColor: c.background },
    loader: { flex: 1 },
    stateWrap: { flex: 1, justifyContent: 'center' as const, paddingHorizontal: spacing[4] },
    thread: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
      gap: spacing[2],
    },
    bubble: {
      maxWidth: '80%' as const,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.lg,
      gap: spacing[0.5],
    },
    bubbleMine: {
      alignSelf: 'flex-end' as const,
      backgroundColor: c.primaryLight,
    },
    bubbleOther: {
      alignSelf: 'flex-start' as const,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
    },
    composer: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      minHeight: MIN_TOUCH_TARGET,
      maxHeight: 120,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    sendBtn: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primary,
    },
    sendBtnDisabled: { opacity: 0.4 },
    composerClosed: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      backgroundColor: c.surface,
    },
    composerClosedText: {
      textAlign: 'center' as const,
    },
  };
}
