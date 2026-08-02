import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Maximize2, Plus, Send } from 'lucide-react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { Cluster, Row } from '@/components/layout/primitives';
import { ScreenActionLayout } from '@/components/layout/ScreenActionLayout';
import { FullscreenImageViewer } from '@/components/ui/FullscreenImageViewer';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { carePhotoPickErrorMessage, pickCarePhoto } from '@/lib/uploads/pick-care-photo';
import { useAuthStore } from '@/store/auth-store';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchCarePhotos,
  postCarePhotoComment,
  uploadCarePhoto,
  type CarePhotoComment,
  type CarePhotoRow,
} from '../detail/api/appointment-detail.service';
import { CarePhotoAttachment } from '../detail/components/blocks/CarePhotoAttachment';
import { isCarePhotoPdf } from '../detail/utils/care-photo-file';
import {
  carePhotoComposerPlaceholder,
  carePhotoDiscussionHeaderSubtitle,
} from '../detail/utils/care-photo-copy';
import { loadCarePhotoLocalUri } from '../detail/utils/care-photo-image';
import {
  latestCarePhoto,
  markAllCarePhotoThreadsSeen,
  markCarePhotoThreadSeen,
  sortPhotosChronologically,
} from '../detail/utils/care-photo-thread-digest';
import type { AppointmentDetailRole } from '../detail/utils/appointment-detail-role-config';
import { useAppointmentDetail } from '../hooks/use-appointment-detail';
import {
  appointmentDetailBlockReason,
  resolveAppointmentDetail,
} from '../hooks/appointment-detail-result';
import { AppointmentDetailBlockedEmptyState } from '../detail/components/AppointmentDetailBlockedEmptyState';
import { rdvMaquetteAvatarCounterparty } from '@/utils/rdv-maquette-card-display';
import { staffPatientProfilePath } from '@/features/patients/utils/staff-hub-navigation';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { SkeletonList } from '@/components/ui/skeletons';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

const COMPOSER_BAR_HEIGHT = 56 + spacing[2];
const HEADER_AVATAR = 44;

interface Props {
  role: AppointmentDetailRole;
}

function formatShortDate(iso: string) {
  const d = dayjs(iso);
  return d.isValid() ? d.format('D MMM · HH:mm') : iso;
}

function formatPhotoDate(iso?: string) {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid()
    ? d.format('D MMMM YYYY · HH:mm')
    : new Date(iso).toLocaleString('fr-FR');
}

function sortedComments(comments: CarePhotoComment[] | undefined): CarePhotoComment[] {
  return [...(comments ?? [])].sort((a, b) =>
    String(a.created_at).localeCompare(String(b.created_at)),
  );
}

export function CarePhotoDiscussionScreen({
  role }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_screens_CarePhotoDiscussionScreen_tsx_styles');
  const { id: appointmentId } = useLocalSearchParams<{ id: string; photoId?: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const detailQ = useAppointmentDetail(appointmentId);
  const detailBlock = appointmentDetailBlockReason(detailQ.data);
  const apt = resolveAppointmentDetail(detailQ.data);
  const patientHeader = useMemo(() => {
    if (!apt) return null;
    const cardRole = role === 'nurse' ? 'nurse' : role === 'pro' ? 'pro' : 'patient';
    return rdvMaquetteAvatarCounterparty(apt, cardRole);
  }, [apt, role]);

  const patientProfilePath = useMemo(
    () => staffPatientProfilePath(role, apt?.patient_id),
    [apt?.patient_id, role],
  );

  const headerSubtitle = useMemo(
    () => carePhotoDiscussionHeaderSubtitle(apt, role),
    [apt, role],
  );

  const [draft, setDraft] = useState('');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | undefined>();
  const [previewOpen, setPreviewOpen] = useState(false);

  const threadQ = useQuery({
    queryKey: ['appointments', 'care-photos', appointmentId] as const,
    queryFn: async () => {
      const res = await fetchCarePhotos(appointmentId!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: Boolean(appointmentId),
    refetchInterval: 8000,
  });

  const photos = useMemo(
    () => sortPhotosChronologically(threadQ.data?.photos ?? []),
    [threadQ.data?.photos],
  );
  const canComment = threadQ.data?.can_comment ?? false;
  const canUpload = threadQ.data?.can_upload ?? false;
  const threadDocumentId = threadQ.data?.thread?.document_id ?? null;
  const commentTargetId = threadDocumentId ?? latestCarePhoto(photos)?.id ?? null;

  const markSeen = useCallback(async () => {
    if (!appointmentId) return;
    const tasks: Promise<void>[] = [];
    if (photos.length > 0) {
      tasks.push(markAllCarePhotoThreadsSeen(appointmentId, photos));
    }
    if (threadDocumentId && threadQ.data?.thread?.comments) {
      tasks.push(
        markCarePhotoThreadSeen(appointmentId, {
          id: threadDocumentId,
          comments: threadQ.data.thread.comments,
        }),
      );
    }
    if (tasks.length > 0) await Promise.all(tasks);
  }, [appointmentId, photos, threadDocumentId, threadQ.data?.thread?.comments]);

  useFocusEffect(
    useCallback(() => {
      void markSeen();
    }, [markSeen]),
  );

  useEffect(() => {
    if (photos.length > 0) void markSeen();
  }, [photos, markSeen]);

  useEffect(() => {
    if (photos.length === 0) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 120);
    return () => clearTimeout(t);
  }, [photos.length]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!draft.trim() || !appointmentId) return;
      const res = await postCarePhotoComment(
        appointmentId,
        draft.trim(),
        commentTargetId ?? undefined,
      );
      if (!res.success) throw new Error(res.error ?? 'Envoi impossible');
    },
    onSuccess: async () => {
      setDraft('');
      toast('Message envoyé', { type: 'success' });
      await qc.invalidateQueries({ queryKey: ['appointments', 'care-photos', appointmentId] });
      await qc.invalidateQueries({ queryKey: queryKeys.documents.medical(appointmentId!) });
      scrollToBottom();
    },
    onError: (e) => handleApiError(e, toast, 'care-photo-comment'),
  });

  const uploadMut = useMutation({
    mutationFn: async (file: { uri: string; fileName: string; mimeType: string }) => {
      if (!appointmentId) throw new Error('Rendez-vous invalide');
      const r = await uploadCarePhoto(appointmentId, file);
      if (!r.ok) throw new Error(r.error ?? 'Upload échoué');
    },
    onSuccess: async () => {
      toast('Fichier envoyé', { type: 'success' });
      await qc.invalidateQueries({ queryKey: ['appointments', 'care-photos', appointmentId] });
      await qc.invalidateQueries({ queryKey: queryKeys.documents.medical(appointmentId!) });
      scrollToBottom();
    },
    onError: (e) => handleApiError(e, toast, 'care-photo-upload'),
  });

  const pickAndUpload = useCallback(async () => {
    try {
      const picked = await pickCarePhoto();
      if (picked) uploadMut.mutate(picked);
    } catch (e) {
      toast(carePhotoPickErrorMessage(e), { type: 'warning' });
    }
  }, [toast, uploadMut]);

  const openLightbox = useCallback(
    async (photo: CarePhotoRow) => {
      const uri = await loadCarePhotoLocalUri(photo.id);
      if (!uri) {
        toast('Impossible d’afficher le fichier', { type: 'warning' });
        return;
      }
      if (isCarePhotoPdf(photo)) {
        setPreviewUri(uri);
        setPreviewFileName(photo.file_name?.trim() || 'Document PDF');
        setPreviewOpen(true);
        return;
      }
      setLightboxUri(uri);
      setLightboxOpen(true);
    },
    [toast],
  );

  const isMine = useCallback(
    (authorId: string) =>
      user?.id != null && user.id !== '' && String(authorId) === String(user.id),
    [user?.id],
  );

  const footerInset = Math.max(insets.bottom, spacing[2]);
  const composerBottomOffset = COMPOSER_BAR_HEIGHT + footerInset;
  const showComposer = canComment || canUpload;

  if (!appointmentId) {
    return (
      <View style={styles.errorWrap}>
        <AppText style={styles.errorText}>Rendez-vous introuvable.</AppText>
      </View>
    );
  }

  if (detailBlock) {
    return (
      <View style={styles.root}>
        <Row align="center" style={[styles.header, { paddingTop: insets.top + spacing[1] }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ChevronLeft size={iconSize.lg} color={c.textPrimary} strokeWidth={2.25} />
          </Pressable>
          <View style={styles.headerSpacer} />
        </Row>
        <AppointmentDetailBlockedEmptyState
          onBack={() => router.back()}
          block={detailBlock}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Row align="center" style={[styles.header, { paddingTop: insets.top + spacing[1] }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={iconSize.lg} color={c.textPrimary} strokeWidth={2.25} />
        </Pressable>
        <Cluster
          gap={spacing[3]}
          align="center"
          style={styles.headerIdentity}
          leading={
            patientHeader?.name ? (
              <ProfileAvatar
                profileImageUrl={patientHeader.profileImageUrl}
                seed={patientHeader.name || apt?.id || appointmentId}
                gender={patientHeader.gender}
                size={HEADER_AVATAR}
                style={styles.headerAvatar}
              />
            ) : undefined
          }
        >
          {patientHeader?.name ? (
            <View style={styles.headerCopy}>
              {patientProfilePath ? (
                <Pressable
                  onPress={() => router.push(patientProfilePath as never)}
                  accessibilityRole="link"
                  accessibilityLabel={`Voir la fiche de ${patientHeader.name}`}
                >
                  <AppText style={[styles.headerPatientName, styles.headerPatientLink]} numberOfLines={1}>
                    {patientHeader.name}
                  </AppText>
                </Pressable>
              ) : (
                <AppText style={styles.headerPatientName} numberOfLines={1}>
                  {patientHeader.name}
                </AppText>
              )}
              <AppText style={styles.headerSub}>{headerSubtitle}</AppText>
            </View>
          ) : (
            <View style={styles.headerCopy}>
              <AppText style={styles.headerTitle}>Échanges</AppText>
              <AppText style={styles.headerSub}>{headerSubtitle}</AppText>
            </View>
          )}
        </Cluster>
        <View style={styles.headerSpacer} />
      </Row>

      <ScreenActionLayout
        style={styles.flex}
        footer={
          showComposer ? (
            <KeyboardStickyView offset={{ closed: 0, opened: footerInset }}>
              <Row align="end" gap={spacing[2]} style={[styles.composerBar, { paddingBottom: footerInset }]}>
                {canUpload ? (
                  <Pressable
                    style={styles.attachBtn}
                    onPress={() => void pickAndUpload()}
                    disabled={uploadMut.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Ajouter une photo ou un document"
                  >
                    {uploadMut.isPending ? (
                      <ActivityIndicator size="small" color={c.primary} />
                    ) : (
                      <Plus size={iconSize.lg} color={c.primary} strokeWidth={2.25} />
                    )}
                  </Pressable>
                ) : null}
                {canComment ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder={carePhotoComposerPlaceholder(role)}
                      placeholderTextColor={c.textTertiary}
                      value={draft}
                      onChangeText={setDraft}
                      multiline
                      maxLength={2000}
                      textAlignVertical="center"
                      editable={canComment}
                    />
                    <Pressable
                      style={[
                        styles.sendBtn,
                        (!draft.trim() || sendMut.isPending || !canComment) &&
                          styles.sendDisabled,
                      ]}
                      onPress={() => sendMut.mutate()}
                      disabled={!draft.trim() || sendMut.isPending || !canComment}
                      accessibilityRole="button"
                      accessibilityLabel="Envoyer le message"
                    >
                      {sendMut.isPending ? (
                        <ActivityIndicator size="small" color={c.textInverse} />
                      ) : (
                        <Send size={iconSize.md} color={c.textInverse} strokeWidth={2.25} />
                      )}
                    </Pressable>
                  </>
                ) : (
                  <AppText style={styles.readOnlyHint}>Lecture seule</AppText>
                )}
              </Row>
            </KeyboardStickyView>
          ) : undefined
        }
      >
        <KeyboardScrollView
          ref={scrollRef}
          style={styles.flex}
          bottomOffset={showComposer ? composerBottomOffset : footerInset}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {threadQ.isLoading ? (
            <SkeletonList count={2} itemHeight={140} gap={spacing[4]} />
          ) : threadQ.isError ? (
            <View style={styles.emptyCard}>
              <AppText style={styles.emptyTitle}>Discussion indisponible</AppText>
              <AppText style={styles.emptySub}>
                {threadQ.error instanceof Error ? threadQ.error.message : 'Erreur de chargement'}
              </AppText>
            </View>
          ) : photos.length === 0 && !threadQ.data?.thread?.comments?.length ? (
            <View style={styles.emptyCard}>
              <AppText style={styles.emptyTitle}>Démarrez la conversation</AppText>
              <AppText style={styles.emptySub}>
                {canUpload
                  ? 'Envoyez un message ou utilisez le bouton + pour partager une photo ou un PDF.'
                  : 'Les messages et fichiers partagés apparaîtront ici.'}
              </AppText>
            </View>
          ) : (
            <>
              {threadQ.data?.thread?.comments?.length ? (
                <View style={styles.thread}>
                  {sortedComments(threadQ.data.thread.comments).map((c) => {
                    const mine = isMine(c.author_id);
                    return (
                      <View
                        key={c.id}
                        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
                      >
                        <Row justify="between" gap={spacing[2]} style={styles.bubbleMeta}>
                          <AppText style={[styles.author, mine && styles.authorMine]}>
                            {c.author_name}
                          </AppText>
                          <AppText style={[styles.time, mine && styles.timeMine]}>
                            {formatShortDate(c.created_at)}
                          </AppText>
                        </Row>
                        <AppText style={[styles.body, mine && styles.bodyMine]}>{c.body}</AppText>
                      </View>
                    );
                  })}
                </View>
              ) : null}
              {photos.map((photo, idx) => (
                <PhotoThreadBlock
                  key={photo.id}
                  photo={photo}
                  index={idx}
                  isMine={isMine}
                  onZoom={() => void openLightbox(photo)}
                />
              ))}
            </>
          )}
        </KeyboardScrollView>
      </ScreenActionLayout>

      <FullscreenImageViewer
        visible={lightboxOpen}
        uri={lightboxUri}
        onClose={() => {
          setLightboxOpen(false);
          setLightboxUri(null);
        }}
      />

      <MedicalDocumentPreviewModal
        visible={previewOpen}
        localUri={previewUri}
        fileName={previewFileName}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewUri(null);
          setPreviewFileName(undefined);
        }}
      />
    </View>
  );
}

function PhotoThreadBlock({
  photo,
  index,
  isMine,
  onZoom,
}: {
  photo: CarePhotoRow;
  index: number;
  isMine: (authorId: string) => boolean;
  onZoom: () => void;
}) {
  const appColors = useAppColors();
  const styles = useThemedStyles(buildStyles, 'CarePhotoDiscussionScreen.PhotoThreadBlock');
  const comments = sortedComments(photo.comments);

  return (
    <View style={styles.photoBlock}>
      <AppText style={styles.photoBlockLabel}>
        {isCarePhotoPdf(photo) ? `Document ${index + 1}` : `Photo ${index + 1}`}
      </AppText>
      {photo.created_at ? (
        <AppText style={styles.photoBlockDate}>{formatPhotoDate(photo.created_at)}</AppText>
      ) : null}
      <CarePhotoAttachment
        photo={photo}
        style={styles.heroImageWrap}
        onZoom={onZoom}
        accessibilityLabel={`Ouvrir le fichier ${index + 1}`}
      >
        {!isCarePhotoPdf(photo) ? (
          <Row align="center" gap={5} style={styles.zoomPill}>
            <Maximize2 size={iconSize.xs} color={appColors.textInverse} strokeWidth={2.5} />
            <AppText style={styles.zoomPillText}>Agrandir</AppText>
          </Row>
        ) : null}
      </CarePhotoAttachment>

      {comments.length === 0 ? (
        <AppText style={styles.noComments}>Aucun message sur cette photo.</AppText>
      ) : (
        <View style={styles.thread}>
          {comments.map((c) => {
            const mine = isMine(c.author_id);
            return (
              <View
                key={c.id}
                style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
              >
                <Row justify="between" gap={spacing[2]} style={styles.bubbleMeta}>
                  <AppText style={[styles.author, mine && styles.authorMine]}>{c.author_name}</AppText>
                  <AppText style={[styles.time, mine && styles.timeMine]}>
                    {formatShortDate(c.created_at)}
                  </AppText>
                </Row>
                <AppText style={[styles.body, mine && styles.bodyMine]}>{c.body}</AppText>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  root: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
  },
  flex: { minWidth: 0, flex: 1 },
  errorWrap: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: spacing[6],
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  header: {
    minWidth: 0,
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[3],
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderLight,
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing[1],
  },
  headerAvatar: {
    flexShrink: 0,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center' as const,
    gap: 2,
  },
  headerSpacer: { width: 44 },
  headerPatientName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  headerPatientLink: {
    color: c.primaryDark,
    textDecorationLine: 'underline' as const,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
  },
  headerSub: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[5],
  },
  emptyCard: {
    padding: spacing[5],
    borderRadius: radius.xl,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textTertiary,
    textAlign: 'center' as const,
    lineHeight: fontSize.sm * 1.45,
  },
  photoBlock: {
    gap: spacing[2],
  },
  photoBlockLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  photoBlockDate: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    marginTop: -4,
  },
  heroImageWrap: {
    width: '100%' as const,
    aspectRatio: 1,
    borderRadius: radius['2xl'],
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
  zoomPill: {
    minWidth: 0,
    position: 'absolute' as const,
    bottom: spacing[3],
    right: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  zoomPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textInverse,
  },
  noComments: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    paddingVertical: spacing[1],
  },
  thread: { gap: spacing[2] },
  bubble: {
    maxWidth: '88%' as const,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
  },
  bubbleMine: {
    alignSelf: 'flex-end' as const,
    backgroundColor: c.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    alignSelf: 'flex-start' as const,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleMeta: {
    minWidth: 0,
    marginBottom: 4,
  },
  author: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  authorMine: { color: 'rgba(255,255,255,0.9)' },
  time: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  timeMine: { color: 'rgba(255,255,255,0.75)' },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.45,
  },
  bodyMine: { color: c.textInverse },
  composerBar: {
    minWidth: 0,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
    backgroundColor: c.surface,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 2,
  },
  input: {
    minWidth: 0,
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === 'ios' ? spacing[2.5] : spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: c.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 2,
  },
  sendDisabled: { opacity: 0.45 },
  readOnlyHint: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center' as const,
    paddingVertical: spacing[3],
  },
};
}

