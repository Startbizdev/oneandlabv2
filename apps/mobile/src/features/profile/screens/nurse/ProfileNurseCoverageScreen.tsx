import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
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
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import type { AddressPayload } from '@/features/appointments/form/types';

const MIN_RADIUS = 5;
const DEFAULT_RADIUS = 20;

export function ProfileNurseCoverageScreen() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS);

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
        setRadiusKm(Math.max(MIN_RADIUS, r));
        hydratedRef.current = true;
      }
    }
  }, [zoneQ.data]);

  const save = useMutation({
    mutationFn: async (radius: number) => {
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
      await saveCoverageZone({
        center_lat: address!.lat,
        center_lng: address!.lng,
        radius_km: radius,
        role: 'nurse',
      });
    },
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      void qc.invalidateQueries({
        queryKey: queryKeys.profile.coverageZones(user!.id, 'nurse'),
      });
      toast('Rayon enregistré', { type: 'success' });
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

  const onRadiusChange = (km: number) => {
    setRadiusKm(km);
    if (!hydratedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!save.isPending) save.mutate(km);
    }, 500);
  };

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return (
    <ProfileSubScreenLayout hideSave>
      <Text style={styles.intro}>
        Ajustez le rayon autour de votre adresse professionnelle. Chaque modification est
        enregistrée automatiquement.
      </Text>
      <Text style={styles.hint}>
        Adresse issue de vos coordonnées — modifiez-la dans Coordonnées si besoin.
      </Text>
      <ProfileCoverageEditor
        embedded
        showDiscoveryHint
        hideAddressCard
        externalAddress={address}
        radiusKm={radiusKm}
        onRadiusKmChange={onRadiusChange}
        savingRadius={save.isPending}
      />
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    lineHeight: fontSize.xs * 1.45,
    marginTop: -spacing[2],
  },
});
