import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/api/client';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface CarePhoto {
  id: string;
  url?: string;
  thumbnail_url?: string;
  caption?: string;
}

export function CarePhotosSection({ appointmentId }: { appointmentId: string }) {
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
      <View style={styles.photoGrid}>
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
                <Text style={styles.photoPlaceholderText}>Photo</Text>
              </View>
            )}
            {p.caption ? (
              <Text style={styles.caption} numberOfLines={2}>
                {p.caption}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
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

const styles = StyleSheet.create({
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
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
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  commentSection: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
});
