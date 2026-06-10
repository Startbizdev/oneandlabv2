import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, MessageCircle, Upload } from 'lucide-react-native';
import { CarePhotoAttachment } from './CarePhotoAttachment';
import type { Appointment } from '@oneandlab/shared-types';
import { fetchCarePhotos, uploadCarePhoto } from '../../api/appointment-detail.service';
import {
  canUploadCarePhotos,
  isCarePhotoGalleryContext,
} from '../../utils/care-photo-rules';
import { carePhotosPanelIntro } from '../../utils/care-photo-copy';
import { carePhotoDiscussionHref } from '../../utils/care-photo-navigation';
import { latestCarePhoto } from '../../utils/care-photo-thread-digest';
import { useCarePhotoUnread } from '../../hooks/use-care-photo-unread';
import type { AppointmentDetailRole } from '../../utils/appointment-detail-role-config';
import { carePhotoPickErrorMessage, pickCarePhoto } from '@/lib/uploads/pick-care-photo';
import { Button } from '@/components/ui/Button';
import { FullscreenImageViewer } from '@/components/ui/FullscreenImageViewer';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import type { CarePhotoRow } from '../../api/appointment-detail.service';
import { isCarePhotoPdf } from '../../utils/care-photo-file';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { SkeletonList } from '@/components/ui/skeletons';
import { loadCarePhotoLocalUri } from '../../utils/care-photo-image';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  apt: Appointment;
  userId?: string;
  readOnly?: boolean;
  viewerRole?: AppointmentDetailRole | string;
}

export function DetailCarePhotosPanel({
  apt,
  userId,
  readOnly,
  viewerRole = 'nurse',
}: Props) {
  const router = useRouter();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | undefined>();
  const [previewOpen, setPreviewOpen] = useState(false);

  const q = useQuery({
    queryKey: ['appointments', 'care-photos', apt.id] as const,
    queryFn: async () => {
      const res = await fetchCarePhotos(apt.id);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: isCarePhotoGalleryContext(apt),
    refetchInterval: 8000,
  });

  const canUpload =
    !readOnly &&
    (q.data?.can_upload === true ||
      (q.data?.can_upload == null && canUploadCarePhotos(apt, userId, viewerRole)));

  const photos = q.data?.photos ?? [];
  const hasPhotos = photos.length > 0;
  const { unread, refreshUnread } = useCarePhotoUnread(apt.id, photos, userId);

  const openExchange = useCallback(
    (photoId?: string) => {
      const target = photoId ?? latestCarePhoto(photos)?.id;
      if (!target) return;
      router.push(carePhotoDiscussionHref(viewerRole, apt.id, target) as never);
    },
    [router, viewerRole, apt.id, photos],
  );

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

  const uploadMut = useMutation({
    mutationFn: async (file: { uri: string; fileName: string; mimeType: string }) => {
      const r = await uploadCarePhoto(apt.id, file);
      if (!r.ok) throw new Error(r.error ?? 'Upload échoué');
    },
    onSuccess: async () => {
      toast('Fichier envoyé', { type: 'success' });
      await qc.invalidateQueries({ queryKey: ['appointments', 'care-photos', apt.id] });
      await qc.invalidateQueries({ queryKey: queryKeys.documents.medical(apt.id) });
      const res = await fetchCarePhotos(apt.id);
      const list = res.data?.photos ?? [];
      const newest = latestCarePhoto(list);
      if (newest?.id) openExchange(newest.id);
      void refreshUnread();
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

  const onPrimaryPress = useCallback(() => {
    if (hasPhotos) {
      openExchange();
      return;
    }
    if (canUpload) void pickAndUpload();
  }, [hasPhotos, canUpload, openExchange, pickAndUpload]);

  if (!isCarePhotoGalleryContext(apt)) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptySub}>
          Les photos de soins sont disponibles pour les rendez-vous prescrits par un professionnel
          de santé.
        </Text>
      </View>
    );
  }

  if (q.isLoading) {
    return (
      <View style={styles.wrap}>
        <SkeletonList count={2} itemHeight={120} gap={spacing[3]} />
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Échange indisponible</Text>
        <Text style={styles.emptySub}>
          {q.error instanceof Error ? q.error.message : 'Erreur de chargement'}
        </Text>
      </View>
    );
  }

  const showOpenCta = hasPhotos;
  const showEmptyReadOnly = !hasPhotos && !canUpload;

  return (
    <View style={styles.wrap}>
      <View style={styles.introCard}>
        <Text style={styles.intro}>{carePhotosPanelIntro(viewerRole)}</Text>
      </View>

      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewRail}
        >
          {photos.map((p, idx) => (
            <View key={p.id} style={styles.previewItem}>
              <CarePhotoAttachment
                photo={p}
                style={styles.previewThumb}
                onZoom={() => void openLightbox(p)}
                accessibilityLabel={`Ouvrir le fichier ${idx + 1}`}
              />
              <Text style={styles.previewLabel}>Fichier {idx + 1}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {showEmptyReadOnly ? (
        <View style={styles.emptyCard}>
          <Camera size={32} color={colors.textTertiary} strokeWidth={1.75} />
          <Text style={styles.emptyTitle}>Aucune photo pour l’instant</Text>
          <Text style={styles.emptySub}>
            {viewerRole === 'pro'
              ? 'Vous et l’infirmier(ère) assigné(e) pourrez partager des photos de suivi ici.'
              : 'Vous et le professionnel de santé pourrez partager des photos de suivi ici.'}
          </Text>
        </View>
      ) : (
        <View style={styles.ctaWrap}>
          <View style={styles.ctaBadgeHost}>
            <Button
              title={
                uploadMut.isPending
                  ? 'Envoi en cours…'
                  : showOpenCta
                    ? 'Ouvrir l’échange'
                    : 'Télécharger une photo'
              }
              size="lg"
              fullWidth
              loading={uploadMut.isPending}
              leftIcon={
                showOpenCta ? (
                  <MessageCircle size={20} color={colors.textInverse} strokeWidth={2.25} />
                ) : (
                  <Upload size={20} color={colors.textInverse} strokeWidth={2.25} />
                )
              }
              onPress={onPrimaryPress}
            />
            {showOpenCta && unread > 0 ? (
              <View style={styles.unreadBadge} accessibilityLabel={`${unread} nouveaux messages`}>
                <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.ctaHint}>
            {showOpenCta
              ? 'Consultez la discussion et envoyez d’autres photos depuis l’échange.'
              : 'Appareil, galerie ou fichier (image, PDF) · max 25 Mo · ouvre l’échange après envoi.'}
          </Text>
        </View>
      )}
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

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[4] },
  introCard: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    backgroundColor: c.primaryLight,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  intro: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  previewRail: {
    flexDirection: 'row',
    gap: spacing[2.5],
    paddingVertical: spacing[1],
  },
  previewItem: {
    alignItems: 'center',
    gap: spacing[1.5],
    width: 72,
  },
  previewThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  previewLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing[2.5],
    padding: spacing[6],
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textTertiary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.45,
  },
  ctaWrap: {
    gap: spacing[2],
  },
  ctaBadgeHost: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: c.background,
    zIndex: 2,
  },
  unreadBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textInverse,
  },
  ctaHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.45,
    paddingHorizontal: spacing[2],
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_blocks_DetailCarePhotosPanel_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
