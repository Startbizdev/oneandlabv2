import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileImagesBlock } from '@/features/profile/components/ProfileImagesBlock';
import { fetchUser, updateProfileImages } from '@/features/profile/api/profile.service';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';

interface Props {
  showCover: boolean;
}

export function ProfilePhotosSection({ showCover }: Props) {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const q = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => {
      const res = await fetchUser(user!.id);
      return res.data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (q.data) {
      setProfileUrl((q.data as { profile_image_url?: string | null }).profile_image_url ?? null);
      setCoverUrl((q.data as { cover_image_url?: string | null }).cover_image_url ?? null);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: (body: { profile_image_url?: string | null; cover_image_url?: string | null }) =>
      updateProfileImages(user!.id, body),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Photo enregistrée', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateProfileImages'),
  });

  const persist = useCallback(
    (nextProfile: string | null, nextCover: string | null) => {
      setProfileUrl(nextProfile);
      if (showCover) setCoverUrl(nextCover);
      const body: { profile_image_url: string | null; cover_image_url?: string | null } = {
        profile_image_url: nextProfile,
      };
      if (showCover) body.cover_image_url = nextCover;
      save.mutate(body);
    },
    [showCover, save],
  );

  const onChangeProfile = useCallback(
    (url: string | null) => {
      persist(url, coverUrl);
    },
    [coverUrl, persist],
  );

  const onChangeCover = useCallback(
    (url: string | null) => {
      persist(profileUrl, url);
    },
    [profileUrl, persist],
  );

  return (
    <ProfileImagesBlock
      profileImageUrl={profileUrl}
      coverImageUrl={showCover ? coverUrl : null}
      showCover={showCover}
      saving={save.isPending}
      onChangeProfile={onChangeProfile}
      onChangeCover={showCover ? onChangeCover : undefined}
    />
  );
}
