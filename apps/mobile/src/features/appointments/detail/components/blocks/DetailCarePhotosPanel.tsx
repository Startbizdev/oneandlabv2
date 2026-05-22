import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, MessageCircle, Plus } from 'lucide-react-native';
import { CarePhotoThumbnail } from './CarePhotoThumbnail';
import type { Appointment } from '@oneandlab/shared-types';
import { fetchCarePhotos, uploadCarePhoto } from '../../api/appointment-detail.service';
import {
  canNurseCommentCarePhotos,
  canNurseUploadCarePhotos,
  isCarePhotoGalleryContext,
} from '../../utils/care-photo-rules';
import { CarePhotoDiscussionSheet } from './CarePhotoDiscussionSheet';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  apt: Appointment;
  userId?: string;
  readOnly?: boolean;
}

export function DetailCarePhotosPanel({ apt, userId, readOnly }: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [discussionId, setDiscussionId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['appointments', 'care-photos', apt.id] as const,
    queryFn: async () => {
      const res = await fetchCarePhotos(apt.id);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: isCarePhotoGalleryContext(apt),
  });

  const canUpload =
    !readOnly &&
    (q.data?.can_upload === true ||
      (q.data?.can_upload == null && canNurseUploadCarePhotos(apt, userId)));

  const canComment =
    q.data?.can_comment === true ||
    (q.data?.can_comment == null && canNurseCommentCarePhotos(apt, userId));

  const uploadMut = useMutation({
    mutationFn: async (uri: string) => {
      const r = await uploadCarePhoto(apt.id, uri);
      if (!r.ok) throw new Error(r.error ?? 'Upload échoué');
    },
    onSuccess: () => {
      toast('Photo ajoutée', { type: 'success' });
      void qc.invalidateQueries({ queryKey: ['appointments', 'care-photos', apt.id] });
      void qc.invalidateQueries({ queryKey: queryKeys.documents.medical(apt.id) });
    },
    onError: (e) => handleApiError(e, toast, 'care-photo-upload'),
  });

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('Autorisez l’accès aux photos dans les réglages du téléphone.', { type: 'warning' });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]?.uri) uploadMut.mutate(res.assets[0].uri);
  }

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
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Photos indisponibles</Text>
        <Text style={styles.emptySub}>
          {q.error instanceof Error ? q.error.message : 'Erreur de chargement'}
        </Text>
      </View>
    );
  }

  const photos = q.data?.photos ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>
        Partagées par l’infirmier · discussion en direct avec le prescripteur.
      </Text>

      {photos.length === 0 && !canUpload ? (
        <View style={styles.emptyCard}>
          <Camera size={28} color={colors.textTertiary} strokeWidth={1.75} />
          <Text style={styles.emptyTitle}>Aucune photo de soin</Text>
          <Text style={styles.emptySub}>
            L’ajout de photos est réservé à l’infirmier assigné, une fois le rendez-vous confirmé.
          </Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {photos.map((p, idx) => {
            const count = p.comments?.length ?? 0;
            return (
              <View
                key={p.id}
                style={[styles.photoRow, idx > 0 && styles.photoRowBorder]}
              >
                <View style={styles.thumbWrap}>
                  <CarePhotoThumbnail photoId={p.id} />
                </View>
                <View style={styles.photoMeta}>
                  <Text style={styles.photoTitle}>Photo n°{idx + 1}</Text>
                  {p.created_at ? (
                    <Text style={styles.photoDate}>
                      {new Date(p.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  style={styles.exchangesBtn}
                  onPress={() => setDiscussionId(p.id)}
                >
                  <MessageCircle size={15} color={colors.textInverse} strokeWidth={2.25} />
                  <Text style={styles.exchangesBtnText}>Échanges</Text>
                  {count > 0 ? (
                    <View style={styles.exchangesBadge}>
                      <Text style={styles.exchangesBadgeText}>
                        {count > 99 ? '99+' : count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            );
          })}

          {canUpload ? (
            <Pressable
              style={[styles.uploadRow, photos.length > 0 && styles.uploadRowBorder]}
              onPress={() => void pickPhoto()}
              disabled={uploadMut.isPending}
            >
              <Plus size={18} color={colors.primary} strokeWidth={2.5} />
              <View style={styles.uploadTexts}>
                <Text style={styles.uploadTitle}>
                  {uploadMut.isPending ? 'Envoi en cours…' : 'Ajouter une photo'}
                </Text>
                <Text style={styles.uploadHint}>JPG ou PNG · max 25 Mo</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      )}

      <CarePhotoDiscussionSheet
        visible={discussionId != null}
        onClose={() => setDiscussionId(null)}
        appointmentId={apt.id}
        photoId={discussionId}
        viewerUserId={userId}
        canComment={canComment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  intro: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.45,
    paddingHorizontal: spacing[1],
  },
  center: { paddingVertical: spacing[8], alignItems: 'center' },
  emptyCard: {
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[5],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.45,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  photoRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  photoMeta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  photoTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  photoDate: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  exchangesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    position: 'relative',
  },
  exchangesBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textInverse,
  },
  exchangesBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  exchangesBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.textInverse,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: '#FAFAFA',
  },
  uploadRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  uploadTexts: { flex: 1, gap: 2 },
  uploadTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  uploadHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
  },
});
