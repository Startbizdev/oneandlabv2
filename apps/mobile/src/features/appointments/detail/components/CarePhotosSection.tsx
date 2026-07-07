import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Row } from '@/components/layout/primitives';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/api/client';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface CarePhoto {
  id: string;
  url?: string;
  thumbnail_url?: string;
  caption?: string;
}

export function CarePhotosSection({ appointmentId }: { appointmentId: string }) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_CarePhotosSection_tsx_CarePhotosSection_styles');

  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');

  const q = useQuery({
    queryKey: ['appointments', 'care-photos', appointmentId] as const,
    queryFn: async () => {
      const res = await api.get<CarePhoto[]>(`/appointments/${appointmentId}/care-photos`);
      return res.data ?? [];
    },
  });

  const postComment = useMutation({
    mutationFn: async () => {
      return api.post(`/appointments/${appointmentId}/care-photo-comments`, {
        comment: comment.trim(),
      });
    },
    onSuccess: () => {
      setComment('');
      toast('Commentaire envoyé', { type: 'success' });
      void qc.invalidateQueries({ queryKey: ['appointments', 'care-photos', appointmentId] });
    },
    onError: (e) => handleApiError(e, toast, 'care-photo-comment'),
  });

  if (!q.data?.length) return null;

  return (
    <Card shadow="sm" padding="md">
      <Row wrap gap={spacing[2]}>
        {q.data.map((p) => (
          <View key={p.id} style={styles.photoWrap}>
            {p.url || p.thumbnail_url ? (
              <Image
                source={{ uri: p.thumbnail_url ?? p.url }}
                style={styles.photo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <AppText style={styles.photoPlaceholderText}>Photo</AppText>
              </View>
            )}
            {p.caption ? (
              <AppText style={styles.caption} numberOfLines={2}>
                {p.caption}
              </AppText>
            ) : null}
          </View>
        ))}
      </Row>
      <View style={styles.commentSection}>
        <Input label="Commentaire" value={comment} onChangeText={setComment} multiline />
        <Button
          title="Envoyer"
          size="sm"
          variant="outline"
          loading={postComment.isPending}
          onPress={() => postComment.mutate()}
          disabled={!comment.trim()}
        />
      </View>
    </Card>
  );
}

const PHOTO_SIZE = 96;

function buildStyles(c: AppColors) {
  return {
  photoWrap: {
    width: PHOTO_SIZE,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.lg,
  },
  photoPlaceholder: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  photoPlaceholderText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    marginTop: spacing[1],
  },
  commentSection: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
};
}
