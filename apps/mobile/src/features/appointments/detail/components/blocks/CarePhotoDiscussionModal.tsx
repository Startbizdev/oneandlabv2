import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ImagePlus, Maximize2, Send } from 'lucide-react-native';
import { FullscreenImageViewer } from '@/components/ui/FullscreenImageViewer';
import { SkeletonList } from '@/components/ui/skeletons';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchCarePhotos,
  postCarePhotoComment,
  uploadCarePhoto,
  type CarePhotoRow,
} from '../../api/appointment-detail.service';
import { carePhotoComposerPlaceholder } from '../../utils/care-photo-copy';
import type { AppointmentDetailRole } from '../../utils/appointment-detail-role-config';
import { loadCarePhotoLocalUri } from '../../utils/care-photo-image';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
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
  canComment?: boolean;
  canUpload?: boolean;
}

function formatShortDate(iso: string) {
  const d = dayjs(iso);
  return d.isValid() ? d.format('D MMM · HH:mm') : iso;
}

export function CarePhotoDiscussionModal({
  visible,
  onClose,
  appointmentId,
  photoId,
  viewerUserId,
  viewerRole = 'nurse',
  canComment: canCommentProp,
  canUpload: canUploadProp,
}: Props) {
  const { show: toast } = useToast();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(photoId);
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

  const photos = threadQ.data?.photos ?? [];
  const canComment = canCommentProp ?? Boolean(threadQ.data?.can_comment);
  const canUpload = canUploadProp ?? Boolean(threadQ.data?.can_upload);

  const photo: CarePhotoRow | null = useMemo(() => {
    if (!activePhotoId) return null;
    return photos.find((p) => p.id === activePhotoId) ?? null;
  }, [activePhotoId, photos]);

  const orderedComments = useMemo(() => {
    const list = [...(photo?.comments ?? [])];
    list.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return list;
  }, [photo?.comments]);

  const composerPlaceholder = carePhotoComposerPlaceholder(viewerRole);
  const headerSubtitle = photo?.created_at ? formatShortDate(photo.created_at) : undefined;

  useEffect(() => {
    if (visible && photoId) setActivePhotoId(photoId);
  }, [visible, photoId]);

  useEffect(() => {
    if (!visible) {
      setDraft('');
      setLightboxOpen(false);
      setPreviewUri(null);
      return;
    }
    if (!activePhotoId) {
      setPreviewUri(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    void loadCarePhotoLocalUri(activePhotoId).then((uri) => {
      if (!cancelled) {
        setPreviewUri(uri);
        setPreviewLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, activePhotoId]);

  useEffect(() => {
    if (!visible || orderedComments.length === 0) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    return () => clearTimeout(t);
  }, [visible, orderedComments.length, activePhotoId]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!activePhotoId || !draft.trim()) return;
      const res = await postCarePhotoComment(appointmentId, activePhotoId, draft.trim());
      if (!res.success) throw new Error(res.error ?? 'Envoi impossible');
    },
    onSuccess: () => {
      setDraft('');
      toast('Message envoyé', { type: 'success' });
      void qc.invalidateQueries({ queryKey: ['appointments', 'care-photos', appointmentId] });
      void qc.invalidateQueries({ queryKey: queryKeys.documents.medical(appointmentId) });
      scrollToBottom();
    },
    onError: (e) => handleApiError(e, toast, 'care-photo-comment'),
  });

  const uploadMut = useMutation({
    mutationFn: async (uri: string) => {
      const r = await uploadCarePhoto(appointmentId, uri);
      if (!r.ok) throw new Error(r.error ?? 'Upload échoué');
    },
    onSuccess: async () => {
      toast('Photo envoyée', { type: 'success' });
      await qc.invalidateQueries({ queryKey: ['appointments', 'care-photos', appointmentId] });
      await qc.invalidateQueries({ queryKey: queryKeys.documents.medical(appointmentId) });
      const res = await fetchCarePhotos(appointmentId);
      const list = res.data?.photos ?? [];
      const newest = [...list].sort((a, b) =>
        String(b.created_at).localeCompare(String(a.created_at)),
      )[0];
      if (newest?.id) setActivePhotoId(newest.id);
      scrollToBottom();
    },
    onError: (e) => handleApiError(e, toast, 'care-photo-upload'),
  });

  const pickAndUpload = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('Autorisez l’accès aux photos dans les réglages.', { type: 'warning' });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]?.uri) uploadMut.mutate(res.assets[0].uri);
  }, [toast, uploadMut]);

  const isMine = useCallback(
    (authorId: string) =>
      viewerUserId != null && viewerUserId !== '' && String(authorId) === String(viewerUserId),
    [viewerUserId],
  );

  const openLightbox = useCallback(() => {
    if (!previewLoading && previewUri) setLightboxOpen(true);
  }, [previewLoading, previewUri]);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View style={[styles.root, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.25} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Échanges</Text>
              {headerSubtitle ? (
                <Text style={styles.headerSub} numberOfLines={1}>
                  {headerSubtitle}
                </Text>
              ) : null}
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {photos.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRail}
            >
              {photos.map((p, idx) => {
                const active = p.id === activePhotoId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setActivePhotoId(p.id)}
                    style={[styles.photoChip, active && styles.photoChipActive]}
                  >
                    <Text style={[styles.photoChipText, active && styles.photoChipTextActive]}>
                      Photo {idx + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
          >
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                onPress={openLightbox}
                disabled={previewLoading || !previewUri}
                style={({ pressed }) => [
                  styles.previewCard,
                  pressed && previewUri ? styles.previewPressed : null,
                  (!previewUri || previewLoading) && styles.previewDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Agrandir la photo"
              >
                {previewLoading ? (
                  <ActivityIndicator color={colors.primary} size="large" />
                ) : previewUri ? (
                  <>
                    <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
                    <View style={styles.zoomPill}>
                      <Maximize2 size={14} color={colors.textInverse} strokeWidth={2.5} />
                      <Text style={styles.zoomPillText}>Agrandir</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.previewMissing}>Aperçu indisponible</Text>
                )}
              </Pressable>

              {threadQ.isLoading ? (
                <SkeletonList count={3} itemHeight={64} gap={spacing[2]} />
              ) : orderedComments.length === 0 ? (
                <Text style={styles.emptyThread}>
                  Aucun message. Écrivez ci-dessous ou envoyez une photo.
                </Text>
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
                          <Text style={[styles.author, mine && styles.authorMine]}>
                            {c.author_name}
                          </Text>
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
            </ScrollView>

            {canComment || canUpload ? (
              <View style={[styles.composerBar, { paddingBottom: Math.max(insets.bottom, spacing[2]) }]}>
                {canUpload ? (
                  <Pressable
                    style={styles.attachBtn}
                    onPress={() => void pickAndUpload()}
                    disabled={uploadMut.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Envoyer une photo"
                  >
                    {uploadMut.isPending ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <ImagePlus size={22} color={colors.primary} strokeWidth={2.25} />
                    )}
                  </Pressable>
                ) : null}
                {canComment ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder={composerPlaceholder}
                      placeholderTextColor={colors.textTertiary}
                      value={draft}
                      onChangeText={setDraft}
                      multiline
                      maxLength={2000}
                      textAlignVertical="center"
                    />
                    <Pressable
                      style={[styles.sendBtn, (!draft.trim() || sendMut.isPending) && styles.sendDisabled]}
                      onPress={() => sendMut.mutate()}
                      disabled={!draft.trim() || sendMut.isPending}
                      accessibilityRole="button"
                      accessibilityLabel="Envoyer le message"
                    >
                      {sendMut.isPending ? (
                        <ActivityIndicator size="small" color={colors.textInverse} />
                      ) : (
                        <Send size={20} color={colors.textInverse} strokeWidth={2.25} />
                      )}
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.readOnlyHint}>Lecture seule</Text>
                )}
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <FullscreenImageViewer
        visible={visible && lightboxOpen}
        uri={previewUri}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

const PREVIEW_SIZE = 220;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bookingCanvasLight,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  headerSpacer: { width: 44 },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  headerSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  photoRail: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  photoChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  photoChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  photoChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  photoChipTextActive: {
    color: colors.primaryDark,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[6],
    gap: spacing[4],
  },
  previewCard: {
    alignSelf: 'center',
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  previewPressed: { opacity: 0.94 },
  previewDisabled: { opacity: 0.75 },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  zoomPill: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  zoomPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.textInverse,
  },
  previewMissing: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    padding: spacing[4],
    textAlign: 'center',
  },
  emptyThread: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  thread: { gap: spacing[2.5] },
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
    backgroundColor: colors.surface,
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
  authorMine: { color: 'rgba(255,255,255,0.9)' },
  time: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
  },
  timeMine: { color: 'rgba(255,255,255,0.75)' },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.45,
  },
  bodyMine: { color: colors.textInverse },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
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
    paddingVertical: Platform.OS === 'ios' ? spacing[2.5] : spacing[2],
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
    marginBottom: 2,
  },
  sendDisabled: { opacity: 0.45 },
  readOnlyHint: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing[3],
  },
});
