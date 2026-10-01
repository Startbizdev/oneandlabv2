import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileCoverageEditor } from '@/features/profile/components/ProfileCoverageEditor';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import {
  fetchCoverageZones,
  fetchUser,
  saveCoverageZone,
} from '@/features/profile/api/profile.service';
import {
  hasValidGeoAddress,
  parseProfileAddress,
} from '@/features/profile/utils/parse-profile-address';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { coverageZoneSaveErrorMessage } from '@oneandlab/shared-api';
import type { CoveragePolygonPayload } from '@oneandlab/shared-utils';

const MIN_RADIUS = 5;
const DEFAULT_RADIUS = 20;

export function ProfileNurseCoverageScreen() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [halfSideKm, setHalfSideKm] = useState(DEFAULT_RADIUS);

  const userQ = useQuery({
    queryKey: queryKeys.profile.fullUser(user?.id ?? ''),
    queryFn: async () => {
      const res = await fetchUser(user!.id, 'full');
      if (!res.success || !res.data) throw new Error('Profil indisponible');
      return res.data;
    },
    enabled: !!user?.id,
  });

  const zoneQ = useQuery({
    queryKey: queryKeys.profile.coverageZones(user?.id ?? '', 'nurse'),
    queryFn: async () => {
      const res = await fetchCoverageZones(user!.id, 'nurse');
      return res.data ?? [];
    },
    enabled: !!user?.id,
  });

  const address = userQ.data ? parseProfileAddress(userQ.data.address) : null;

  useEffect(() => {
    const r = Number(zoneQ.data?.[0]?.radius_km);
    if (zoneQ.data?.[0]?.radius_km != null && Number.isFinite(r)) {
      setHalfSideKm(Math.max(MIN_RADIUS, r));
    }
  }, [zoneQ.data]);

  const save = useMutation({
    mutationFn: async (payload: { halfSide: number; bounds: CoveragePolygonPayload }) => {
      if (!hasValidGeoAddress(address)) {
        throw new Error('ADDRESS_REQUIRED');
      }
      await saveCoverageZone({
        center_lat: address!.lat,
        center_lng: address!.lng,
        radius_km: payload.halfSide,
        zone_type: 'polygon',
        bounds_json: payload.bounds,
      });
    },
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      void qc.invalidateQueries({
        queryKey: queryKeys.profile.coverageZones(user!.id, 'nurse'),
      });
      toast('Zone enregistrée', { type: 'success' });
    },
    onError: (e) => {
      if (e instanceof Error && e.message === 'ADDRESS_REQUIRED') {
        toast('Adresse requise', {
          type: 'error',
          message: 'Complétez votre adresse dans Coordonnées (suggestion GPS).',
        });
        return;
      }
      handleApiError(e, toast, 'saveCoverageZone', undefined, coverageZoneSaveErrorMessage);
    },
  });

  /** Résout à `false` en cas d’échec : l’erreur est déjà affichée par `onError`. */
  const onSaveZone = async (half: number, bounds: CoveragePolygonPayload) => {
    if (save.isPending) return false;
    try {
      await save.mutateAsync({ halfSide: half, bounds });
      setHalfSideKm(half);
      return true;
    } catch {
      return false;
    }
  };

  if (userQ.isLoading || zoneQ.isLoading || userQ.isError || zoneQ.isError) {
    return (
      <ProfileLoadState
        loading={userQ.isLoading || zoneQ.isLoading}
        refreshing={userQ.isFetching || zoneQ.isFetching}
        error={userQ.error ?? zoneQ.error}
        onRetry={() => {
          void userQ.refetch();
          void zoneQ.refetch();
        }}
      />
    );
  }

  return (
    <ProfileSubScreenLayout hideSave>
      <ProfileCoverageEditor
        address={address}
        halfSideKm={halfSideKm}
        onSaveZone={onSaveZone}
        savingZone={save.isPending}
      />
    </ProfileSubScreenLayout>
  );
}
