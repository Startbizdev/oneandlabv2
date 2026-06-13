import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, MapPin } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonList } from '@/components/ui/skeletons';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { CoverageMapLive } from '@/features/profile/components/CoverageMapLive';
import { CoverageRadiusControl } from '@/features/profile/components/CoverageRadiusControl';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { fetchCoverageZones, fetchUser, saveCoverageZone, updateUser } from '@/features/profile/api/profile.service';
import {
  hasValidGeoAddress,
  parseProfileAddress,
} from '@/features/profile/utils/parse-profile-address';
import { api } from '@/api/client';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const MIN_RADIUS = 5;
const DEFAULT_RADIUS = 20;

type PlanLimits = {
  plan_slug?: string;
  max_radius_km?: number;
};

interface Props {
  showDiscoveryHint?: boolean;
  externalAddress?: AddressPayload | null;
  hideAddressCard?: boolean;
  /** Intégré au profil : pas de bouton « Enregistrer le rayon » (sauvegarde via le profil). */
  embedded?: boolean;
  radiusKm?: number;
  onRadiusKmChange?: (km: number) => void;
  /** Rayon en cours d'enregistrement (auto-save). */
  savingRadius?: boolean;
}

export function ProfileCoverageEditor({
  showDiscoveryHint = true,
  externalAddress,
  hideAddressCard = false,
  embedded = false,
  radiusKm: controlledRadius,
  onRadiusKmChange,
  savingRadius = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileCoverageEditor_tsx_styles');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();

  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');
  const [internalRadius, setInternalRadius] = useState(DEFAULT_RADIUS);
  const [addressDirty, setAddressDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const radiusKm = controlledRadius ?? internalRadius;
  const setRadiusKm = onRadiusKmChange ?? setInternalRadius;

  const userQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id && !embedded,
  });

  const zoneQ = useQuery({
    queryKey: queryKeys.profile.coverageZones(user?.id ?? '', user?.role ?? ''),
    queryFn: async () => {
      const res = await fetchCoverageZones(user!.id, user!.role);
      return res.data ?? [];
    },
    enabled: !!user?.id && user?.role === 'nurse',
  });

  const limitsQ = useQuery({
    queryKey: queryKeys.planLimits.current,
    queryFn: async () => (await api.get<PlanLimits>('/plan-limits')).data,
    enabled: user?.role === 'nurse',
  });

  const maxRadiusKm = limitsQ.data?.max_radius_km ?? 20;
  const isDiscovery = limitsQ.data?.plan_slug === 'discovery';
  const hasAddress = hasValidGeoAddress(address);

  useEffect(() => {
    if (externalAddress !== undefined) {
      setAddress(externalAddress);
      setAddressComplement(externalAddress?.complement ?? '');
      return;
    }
    if (userQ.data) {
      const parsed = parseProfileAddress((userQ.data as { address?: unknown }).address);
      setAddress(parsed);
      setAddressComplement(parsed?.complement ?? '');
    }
  }, [userQ.data, externalAddress]);

  useEffect(() => {
    const zone = zoneQ.data?.[0];
    if (zone?.radius_km != null && controlledRadius === undefined) {
      const r = Number(zone.radius_km);
      setInternalRadius(Math.min(Math.max(MIN_RADIUS, r), maxRadiusKm));
    }
  }, [zoneQ.data, maxRadiusKm, controlledRadius]);

  const onAddressChange = useCallback((addr: AddressPayload | null) => {
    setAddress(addr);
    setAddressDirty(true);
  }, []);

  const saveStandalone = async () => {
    if (!hasValidGeoAddress(address)) {
      toast('Adresse requise', {
        type: 'error',
        message: 'Choisissez une adresse complète dans la liste de suggestions.',
      });
      return;
    }
    setSaving(true);
    try {
      if (addressDirty && address) {
        await updateUser(user!.id, {
          address: {
            label: address.label.trim(),
            lat: address.lat,
            lng: address.lng,
            complement: addressComplement.trim() || undefined,
          },
        });
      }
      await saveCoverageZone({
        center_lat: address!.lat,
        center_lng: address!.lng,
        radius_km: radiusKm,
        role: user!.role,
      });
      setAddressDirty(false);
      await fetchMe();
      toast(`Zone de ${radiusKm} km enregistrée`, { type: 'success' });
    } catch (e) {
      handleApiError(e, toast, 'saveCoverageZone');
    } finally {
      setSaving(false);
    }
  };

  const loading = embedded
    ? limitsQ.isLoading
    : userQ.isLoading || zoneQ.isLoading || limitsQ.isLoading;

  if (loading) {
    return (
      <View style={{ gap: spacing[3] }}>
        <Skeleton height={220} borderRadius={radius.xl} />
        <SkeletonList count={1} itemHeight={120} gap={spacing[3]} />
      </View>
    );
  }

  const zoneContent = (
    <>
      {!hasAddress ? (
        <View style={styles.alert}>
          <Cluster
            gap={spacing[2]}
            align="start"
            leading={<AlertCircle size={16} color={c.warning} strokeWidth={2} />}
          >
            <Text style={styles.alertText}>
              {hideAddressCard
                ? 'Renseignez une adresse professionnelle valide dans Coordonnées (suggestion avec GPS).'
                : "Définissez d'abord votre adresse pour configurer votre zone de couverture."}
            </Text>
          </Cluster>
        </View>
      ) : (
        <>
          <CoverageMapLive lat={address!.lat} lng={address!.lng} radiusKm={radiusKm} />
          <CoverageRadiusControl
            value={radiusKm}
            min={MIN_RADIUS}
            max={maxRadiusKm}
            onChange={setRadiusKm}
            disabled={saving || savingRadius}
          />
          {savingRadius ? (
            <Text style={styles.savingHint}>Enregistrement du rayon…</Text>
          ) : null}
          {showDiscoveryHint && isDiscovery && maxRadiusKm <= 20 ? (
            <Pressable
              onPress={() => router.push('/(nurse)/abonnement')}
              style={styles.discoveryBanner}
            >
              <Text style={styles.discoveryText}>
                Offre Découverte : rayon limité à 20 km.{' '}
                <Text style={styles.discoveryLink}>Passez en Pro</Text> pour étendre jusqu'à 100 km.
              </Text>
            </Pressable>
          ) : null}
          {!embedded ? (
            <Button
              title="Enregistrer le rayon"
              loading={saving}
              onPress={() => void saveStandalone()}
              fullWidth
              size="lg"
            />
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) {
    return (
      <ProfileSection
        title="Zone de couverture"
        description="Rayon d'intervention autour de votre adresse"
        Icon={MapPin}
      >
        {zoneContent}
      </ProfileSection>
    );
  }

  return (
    <View style={styles.stack}>
      {!hideAddressCard ? (
        <Animated.View entering={FadeInDown.duration(280).springify()} style={[styles.card, elevation.xs]}>
          <View style={styles.cardHeader}>
            <Row gap={spacing[2]} align="center">
              <MapPin size={18} color={c.primary} strokeWidth={2} />
              <Text style={styles.cardTitle}>Adresse professionnelle</Text>
            </Row>
          </View>
          <Text style={styles.cardDesc}>Centre de votre zone d'intervention.</Text>
          <AddressAutocomplete
            value={address}
            complement={addressComplement}
            onChange={onAddressChange}
            onComplementChange={setAddressComplement}
            label="Adresse"
          />
          {!hasAddress && address?.label ? (
            <View style={styles.alert}>
              <Cluster
                gap={spacing[2]}
                align="start"
                leading={<AlertCircle size={16} color={c.warning} strokeWidth={2} />}
              >
                <Text style={styles.alertText}>
                  Sélectionnez une adresse dans les suggestions pour activer la carte et le rayon.
                </Text>
              </Cluster>
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(60).duration(280).springify()} style={[styles.card, elevation.xs]}>
        <Text style={styles.cardTitle}>Zone de couverture</Text>
        <Text style={styles.cardDesc}>Rayon d'intervention autour de votre adresse (en km)</Text>
        {zoneContent}
      </Animated.View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  stack: { gap: spacing[4] },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardHeader: {},
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  cardDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  alert: {
    backgroundColor: c.warningLight,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: c.warningMid,
  },
  alertText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.warning,
    lineHeight: fontSize.sm * 1.45,
  },
  discoveryBanner: {
    backgroundColor: c.warningLight,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: c.warningMid,
  },
  discoveryText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.warning,
    lineHeight: fontSize.sm * 1.45,
  },
  discoveryLink: {
    fontFamily: fontFamily.semiBold,
    textDecorationLine: 'underline' as const,
  },
  savingHint: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.primary,
    textAlign: 'center' as const,
  },
};
}

