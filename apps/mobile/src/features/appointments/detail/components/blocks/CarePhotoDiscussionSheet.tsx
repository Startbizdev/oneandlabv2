import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { Info, Maximize2, MessageSquare, Send } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useSheetTextInputComponent } from '@/components/ui/sheet-keyboard-context';
import { FullscreenImageViewer } from '@/components/ui/FullscreenImageViewer';
import { SkeletonList } from '@/components/ui/skeletons';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchCarePhotos,
  postCarePhotoComment,
  type CarePhotoRow,
} from '../../api/appointment-detail.service';
import {
  carePhotoComposerPlaceholder,
  carePhotoDiscussionHint,
} from '../../utils/care-photo-copy';
import type { AppointmentDetailRole } from '../../utils/appointment-detail-role-config';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import * as FileSystem from 'expo-file-system/legacy';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

interface Props {
  visible: boolean;
  onClose: () => void;
  appointmentId: string;
  photoId: string | null;
  viewerUserId?: string;
  viewerRole?: AppointmentDetailRole | string;
  /** Si false, lecture seule (repli : can_comment API). */
  canComment?: boolean;
}

function formatShortDate(iso: string) {
  const d = dayjs(iso);
  return d.isValid() ? d.format('D MMM · HH:mm') : iso;
}

async function loadPreviewUri(documentId: string): Promise<string | null> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) return null;
  const token = getAuthToken();
  const url = `${getApiBase()}/medical-documents/${encodeURIComponent(documentId)}/download`;
  const dest = `${dir}care-photo-${documentId}.jpg`;
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) return dest;
    const result = await FileSystem.downloadAsync(url, dest, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (result.status >= 200 && result.status < 300) return dest;
  } catch {
    /* ignore */
  }
  return null;
}

export function CarePhotoDiscussionSheet({
  visible,
  onClose,
  appointmentId,
  photoId,
  viewerUserId,
  viewerRole = 'nurse',
  canComment: canCommentProp,
}: Props) {
  const { show: toast } = useToast();
  const TextField = useSheetTextInputComponent();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const threadQ = useQuery({
    queryKey: ['appointments', 'care-photos', appointmentId] as const,
    queryFn: async () => {
      const res = await fetchCarePhotos(appointmentId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: visible && Boolean(appointmentId),
    refetchInterval: visible ? 8000 : false,
  });

  const photo: CarePhotoRow | null = useMemo(() => {
    if (!photoId || !threadQ.data?.photos) return null;
    return threadQ.data.photos.find((p) => p.id === photoId) ?? null;
  }, [photoId, threadQ.data?.photos]);

  const canComment =
    canCommentProp ?? Boolean(threadQ.data?.can_comment);

  const orderedComments = useMemo(() => {
    const list = [...(photo?.comments ?? [])];
    list.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return list;
  }, [photo?.comments]);

  const subtitle = photo?.created_at ? formatShortDate(photo.created_at) : undefined;
  const discussionHint = carePhotoDiscussionHint(viewerRole);
  const composerPlaceholder = carePhotoComposerPlaceholder(viewerRole);

  useEffect(() => {
    if (!visible || !photoId) {
      setPreviewUri(null);
      setLightboxOpen(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    void loadPreviewUri(photoId).then((uri) => {
      if (!cancelled) {
        setPreviewUri(uri);
        setPreviewLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, photoId]);

  useEffect(() => {
    if (!visible) {
      setDraft('');
      setLightboxOpen(false);
    }
  }, [visible]);

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!photoId || !draft.trim()) return;
      const res = await postCarePhotoComment(appointmentId, photoId, draft.trim());
      if (!res.success) throw new Error(res.error ?? 'Envoi impossible');
    },
    onSuccess: () => {
      setDraft('');
      toast('Message envoyé', { type: 'success' });
      void qc.invalidateQueries({ queryKey: ['appointments', 'care-photos', appointmentId] });
      void qc.invalidateQueries({ queryKey: queryKeys.documents.medical(appointmentId) });
    },
    onError: (e) => handleApiError(e, toast, 'care-photo-comment'),
  });

  const isMine = useCallback(
    (authorId: string) =>
      viewerUserId != null && viewerUserId !== '' && String(authorId) === String(viewerUserId),
    [viewerUserId],
  );

  const openLightbox = useCallback(() => {
    if (!previewLoading && previewUri) setLightboxOpen(true);
  }, [previewLoading, previewUri]);

  const composer = canComment ? (
    <View style={styles.composer}>
      <TextField
        style={styles.input}
        placeholder={composerPlaceholder}
        placeholderTextColor={colors.textTertiary}
        value={draft}
        onChangeText={setDraft}
        multiline
        maxLength={2000}
      />
      <Pressable
        style={[styles.sendBtn, (!draft.trim() || sendMut.isPending) && styles.sendDisabled]}
        onPress={() => sendMut.mutate()}
        disabled={!draft.trim() || sendMut.isPending}
      >
        {sendMut.isPending ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <Send size={18} color={colors.textInverse} strokeWidth={2.25} />
        )}
      </Pressable>
    </View>
  ) : null;

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title="Photo — échanges"
        subtitle={subtitle}
        headerIcon={<MessageSquare size={20} color={colors.primary} strokeWidth={2} />}
      >
        <View style={styles.hintCard}>
          <Info size={15} color={colors.primaryDark} strokeWidth={2.25} />
          <Text style={styles.hintText}>{discussionHint}</Text>
        </View>

        <View style={styles.previewWrap}>
          <Pressable
            onPress={openLightbox}
            disabled={previewLoading || !previewUri}
            style={({ pressed }) => [
              styles.previewBtn,
              pressed && previewUri ? styles.previewBtnPressed : null,
              (!previewUri || previewLoading) && styles.previewBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Agrandir la photo"
          >
            {previewLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : previewUri ? (
              <>
                <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
                <View style={styles.zoomBadge}>
                  <Maximize2 size={12} color={colors.textInverse} strokeWidth={2.5} />
                  <Text style={styles.zoomBadgeText}>Agrandir</Text>
                </View>
              </>
            ) : (
              <View style={styles.previewPlaceholder}>
                <Text style={styles.previewPlaceholderText}>Aperçu indisponible</Text>
              </View>
            )}
          </Pressable>
        </View>

        {threadQ.isLoading ? (
          <SkeletonList count={3} itemHeight={64} gap={spacing[2]} />
        ) : orderedComments.length === 0 ? (
          <Text style={styles.empty}>Aucun message pour l’instant.</Text>
        ) : (
          <View style={styles.thread}>
            {orderedComments.map((c) => {
              const mine = isMine(c.author_id);
              return (
                <View
                  key={c.id}
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
                >
                  <View style={styles.bubbleMeta}>
                    <Text style={[styles.author, mine && styles.authorMine]}>{c.author_name}</Text>
                    <Text style={[styles.time, mine && styles.timeMine]}>
                      {formatShortDate(c.created_at)}
                    </Text>
                  </View>
                  <Text style={[styles.body, mine && styles.bodyMine]}>{c.body}</Text>
                </View>
              );
            })}
          </View>
        )}
        {composer}
      </BottomSheet>

      <FullscreenImageViewer
        visible={lightboxOpen}
        uri={previewUri}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    marginBottom: spacing[2],
  },
  hintText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
  previewWrap: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  previewBtn: {
    width: 200,
    height: 200,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  previewBtnPressed: {
    opacity: 0.92,
  },
  previewBtnDisabled: {
    opacity: 0.7,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  zoomBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.textInverse,
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  thread: { gap: spacing[2.5], paddingBottom: spacing[2] },
  bubble: {
    maxWidth: '88%',
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: 4,
  },
  author: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textSecondary,
  },
  authorMine: { color: 'rgba(255,255,255,0.85)' },
  time: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
  },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.45,
  },
  bodyMine: { color: colors.textInverse },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    paddingTop: spacing[2],
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
});
