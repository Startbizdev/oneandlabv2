import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.appointments.conversation(appointmentId),
    queryFn: async () => {
      const res = await fetchAppointmentConversation(appointmentId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: !!appointmentId,
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { body: string; file?: { uri: string; name: string; type: string } }) => {
      if (payload.file) {
        return postAppointmentConversationAttachment(appointmentId, payload.file, payload.body);
      }
      return postAppointmentConversationMessage(appointmentId, payload.body);
    },
    onSuccess: async () => {
      setDraft('');
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
        file: { uri: picked.uri, name: picked.name, type: picked.mimeType ?? 'image/jpeg' },
      });
    } catch (e) {
      handleApiError(e, toast, 'conversation-attachment');
    }
  }

  const messages = data?.messages ?? [];
  const canPost = Boolean(data?.can_post);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing[8] }} color={c.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
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
                <AppText style={[styles.attachment, { color: c.primary }]}>{msg.attachment.file_name}</AppText>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
      {canPost ? (
        <View style={[styles.composer, { borderTopColor: c.border, backgroundColor: c.surface }]}>
          <Input value={draft} onChangeText={setDraft} placeholder="Votre message…" multiline />
          <View style={styles.actions}>
            <Button title="Joindre" variant="outline" onPress={() => void onPickAttachment()} />
            <Pressable
              accessibilityRole="button"
              onPress={() => draft.trim() && sendMutation.mutate({ body: draft.trim() })}
              style={[styles.sendBtn, { backgroundColor: c.primary }]}
            >
              <Send color="#fff" size={18} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    list: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[24] },
    bubble: { borderWidth: 1, borderRadius: 12, padding: spacing[3], maxWidth: '88%' },
    bubbleMine: { alignSelf: 'flex-end' },
    bubbleOther: { alignSelf: 'flex-start' },
    author: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, marginBottom: spacing[1] },
    attachment: { marginTop: spacing[2], fontFamily: fontFamily.medium, fontSize: fontSize.xs },
    composer: { borderTopWidth: 1, padding: spacing[3], gap: spacing[2] },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
    sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  });
}
