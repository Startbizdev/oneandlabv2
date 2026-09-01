import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileCoverageEditor } from '@/features/profile/components/ProfileCoverageEditor';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import {
  fetchCoverageZones,
  fetchUser,
  saveCoverageZone,
  updateUser,
} from '@/features/profile/api/profile.service';
import {
  hasValidGeoAddress,
  parseProfileAddress,
} from '@/features/profile/utils/parse-profile-address';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import type { AddressPayload } from '@/features/appointments/form/types';
import type { CoveragePolygonPayload, CoverageVertex } from '@oneandlab/shared-utils';
import { toPolygonPayload } from '@oneandlab/shared-utils';

const MIN_RADIUS = 5;
const DEFAULT_RADIUS = 20;

export function ProfileNurseCoverageScreen() {
  const styles = useThemedStyles(buildStyles, 'ProfileNurseCoverageScreen');

  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const hydratedRef = useRef(false);

  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [halfSideKm, setHalfSideKm] = useState(DEFAULT_RADIUS);
  const [bounds, setBounds] = useState<CoveragePolygonPayload | null>(null);
  const [vertices, setVertices] = useState<CoverageVertex[] | null>(null);

  const userQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
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

  useEffect(() => {
    if (userQ.data) {
      setAddress(parseProfileAddress(userQ.data.address));
    }
  }, [userQ.data]);

  useEffect(() => {
    const zone = zoneQ.data?.[0];
    if (zone?.radius_km != null) {
      const r = Number(zone.radius_km);
      if (Number.isFinite(r)) {
        setHalfSideKm(Math.max(MIN_RADIUS, r));
        hydratedRef.current = true;
      }
    }
    if (zone?.bounds_json) {
      const b = zone.bounds_json as CoveragePolygonPayload;
      setBounds(b);
      if (Array.isArray(b.vertices)) setVertices(b.vertices);
    }
  }, [zoneQ.data]);

  const save = useMutation({
    mutationFn: async (payload: {
      halfSide: number;
      bounds: CoveragePolygonPayload | null;
      vertices: CoverageVertex[] | null;
    }) => {
      if (!hasValidGeoAddress(address)) {
        throw new Error('ADDRESS_REQUIRED');
      }
      await updateUser(user!.id, {
        address: {
          label: address!.label.trim(),
          lat: address!.lat,
          lng: address!.lng,
          complement: address!.complement,
        },
      });
      const zoneBounds =
        payload.bounds ??
        toPolygonPayload(payload.vertices ?? []);
      await saveCoverageZone({
        center_lat: address!.lat,
        center_lng: address!.lng,
        radius_km: payload.halfSide,
        zone_type: 'polygon',
        bounds_json: zoneBounds,
        role: 'nurse',
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
      handleApiError(e, toast, 'saveCoverageZone');
    },
  });

  const onSaveZone = (
    half: number,
    b: CoveragePolygonPayload,
    verts: CoverageVertex[],
  ) => {
    setHalfSideKm(half);
    setBounds(b);
    setVertices(verts);
    if (!hydratedRef.current) return;
    if (!save.isPending) save.mutate({ halfSide: half, bounds: b, vertices: verts });
  };

  return (
    <ProfileSubScreenLayout hideSave>
      <AppText style={styles.intro}>
        Consultez votre zone sur la carte, puis ouvrez l’éditeur plein écran pour l’ajuster au doigt.
        Appuyez sur Valider pour enregistrer.
      </AppText>
      <AppText style={styles.hint}>
        Adresse issue de vos coordonnées — modifiez-la dans Coordonnées si besoin.
      </AppText>
      <ProfileCoverageEditor
        embedded
        showDiscoveryHint
        hideAddressCard
        externalAddress={address}
        halfSideKm={halfSideKm}
        onHalfSideKmChange={setHalfSideKm}
        onBoundsChange={setBounds}
        onVerticesChange={setVertices}
        onSaveZone={onSaveZone}
        savingZone={save.isPending}
      />
    </ProfileSubScreenLayout>
  );
}

function buildStyles(c: AppColors) {
  return StyleSheet.create({
    intro: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: fontSize.xs * 1.45,
      marginTop: -spacing[2],
    },
  });
}
