import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Row } from '@/components/layout/primitives';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, WifiOff } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { pickCarePhoto } from '@/lib/uploads/pick-care-photo';
import {
  fetchAppointmentConversation,
  postAppointmentConversationAttachment,
  postAppointmentConversationMessage,
} from '../detail/api/conversation.service';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function AppointmentConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointmentId = String(id ?? '');
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'AppointmentConversationScreen_styles');
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [draft, setDraft] = useState('');
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const headerHeight = useHeaderHeight();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.appointments.conversation(appointmentId),
    queryFn: async () => {
      const res = await fetchAppointmentConversation(appointmentId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: !!appointmentId,
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { body: string; file?: { uri: string; name: string; type: string } }) => {
      const response = payload.file
        ? await postAppointmentConversationAttachment(appointmentId, payload.file, payload.body)
        : await postAppointmentConversationMessage(appointmentId, payload.body);
      if (!response.success) throw new Error(response.error ?? 'Le message n’a pas été envoyé.');
      return response;
    },
    onSuccess: async (_response, payload) => {
      setDraft(current => current.trim() === payload.body || (payload.file && !current.trim()) ? '' : current);
      await qc.invalidateQueries({ queryKey: queryKeys.appointments.conversation(appointmentId) });
    },
    onError: (e) => handleApiError(e, toast, 'conversation-send'),
  });

  async function onPickAttachment() {
    try {
      const picked = await pickCarePhoto();
      if (!picked) return;
      await sendMutation.mutateAsync({
        body: draft.trim() || '[Pièce jointe]',
        file: { uri: picked.uri, name: picked.fileName, type: picked.mimeType ?? 'image/jpeg' },
      });
    } catch (e) {
      handleApiError(e, toast, 'conversation-attachment');
    }
  }

  const messages = data?.messages ?? [];
  const canPost = Boolean(data?.can_post);

  async function openAttachment(documentId: string, name?: string | null) {
    setOpeningDocumentId(documentId);
    try {
      const result = await openMedicalDocument(documentId, name ?? undefined);
      if (!result.ok) toast(result.error ?? 'Ouverture impossible', { type: 'error' });
    } catch (error) {
      handleApiError(error, toast, 'conversation-open-attachment');
    } finally {
      setOpeningDocumentId(null);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={headerHeight} style={[styles.root, { backgroundColor: c.background }]}>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing[8] }} color={c.primary} />
      ) : isError ? (
        <EmptyState Icon={WifiOff} title="Les échanges n’ont pas pu être chargés" description="Votre message en cours reste disponible." actionLabel="Réessayer" onAction={() => void refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {!messages.length ? <EmptyState Icon={MessageCircle} title="Vos échanges, au même endroit" description="Les messages et pièces jointes de ce rendez-vous apparaîtront ici." /> : null}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.author_id === userId ? styles.bubbleMine : styles.bubbleOther,
                { borderColor: c.border, backgroundColor: msg.author_id === userId ? c.primaryLight : c.surface },
              ]}
            >
              <AppText style={[styles.author, { color: c.textSecondary }]}>{msg.author_name || 'Utilisateur'}</AppText>
              <AppText style={{ color: c.textPrimary }}>{msg.body}</AppText>
              {msg.attachment?.file_name ? (
                <Button title={msg.attachment.file_name} variant="outline" size="sm"
                  loading={openingDocumentId === msg.attachment.id}
                  disabled={openingDocumentId !== null}
                  onPress={() => void openAttachment(msg.attachment!.id, msg.attachment!.file_name)} />
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
      {canPost ? (
        <View style={[styles.composer, { borderTopColor: c.border, backgroundColor: c.surface }]}>
          <Input value={draft} onChangeText={setDraft} placeholder="Votre message…" accessibilityLabel="Votre message" editable={!sendMutation.isPending} multiline />
          <Row gap={spacing[2]} justify="between">
            <Button title="Joindre" variant="outline" disabled={sendMutation.isPending} onPress={() => void onPickAttachment()} />
            <Button title="Envoyer" loading={sendMutation.isPending} disabled={!draft.trim()}
              onPress={() => sendMutation.mutate({ body: draft.trim() })}
              leftIcon={<Send color={c.onPrimary} size={18} />} />
          </Row>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function buildStyles(_c: AppColors) {
  return {
    root: { flex: 1, minWidth: 0 },
    list: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[24] },
    bubble: { borderWidth: 1, borderRadius: 12, padding: spacing[3], maxWidth: '88%' },
    bubbleMine: { alignSelf: 'flex-end' },
    bubbleOther: { alignSelf: 'flex-start' },
    author: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, marginBottom: spacing[1] },
    attachment: { marginTop: spacing[2], fontFamily: fontFamily.medium, fontSize: fontSize.xs },
    composer: { borderTopWidth: 1, padding: spacing[3], gap: spacing[2] },
  } satisfies Parameters<typeof StyleSheet.create>[0];
}
