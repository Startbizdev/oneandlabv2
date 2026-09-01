import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MapPin, Maximize2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { SheetModal } from '@/components/ui/SheetModal';
import { Skeleton, SkeletonList } from '@/components/ui/skeletons';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { CoverageSquareMapLive } from '@/features/profile/components/CoverageSquareMapLive';
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
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import type { CoverageBounds } from '@oneandlab/shared-utils';
import { halfSideKmToBounds, squareAreaKm2 } from '@oneandlab/shared-utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  embedded?: boolean;
  halfSideKm?: number;
  onHalfSideKmChange?: (km: number) => void;
  onBoundsChange?: (bounds: CoverageBounds) => void;
  onDragEnd?: (halfSideKm: number, bounds: CoverageBounds) => void;
  savingZone?: boolean;
}

export function ProfileCoverageEditor({
  showDiscoveryHint = true,
  externalAddress,
  hideAddressCard = false,
  embedded = false,
  halfSideKm: controlledHalfSide,
  onHalfSideKmChange,
  onBoundsChange,
  onDragEnd,
  savingZone = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'ProfileCoverageEditor');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();

  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');
  const [internalHalfSide, setInternalHalfSide] = useState(DEFAULT_RADIUS);
  const [bounds, setBounds] = useState<CoverageBounds | null>(null);
  const [addressDirty, setAddressDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const editorMapHeight = Math.max(360, windowHeight - insets.top - insets.bottom - 180);

  const halfSideKm = controlledHalfSide ?? internalHalfSide;
  const setHalfSideKm = onHalfSideKmChange ?? setInternalHalfSide;

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

  const maxHalfSideKm = limitsQ.data?.max_radius_km ?? 20;
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
    if (zone?.radius_km != null && controlledHalfSide === undefined) {
      const r = Number(zone.radius_km);
      setInternalHalfSide(Math.min(Math.max(MIN_RADIUS, r), maxHalfSideKm));
    }
    if (zone?.bounds_json && typeof zone.bounds_json === 'object') {
      setBounds(zone.bounds_json as CoverageBounds);
    }
  }, [zoneQ.data, maxHalfSideKm, controlledHalfSide]);

  const handleBoundsChange = useCallback(
    (b: CoverageBounds) => {
      setBounds(b);
      onBoundsChange?.(b);
    },
    [onBoundsChange],
  );

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
      const zoneBounds =
        bounds ??
        halfSideKmToBounds({ lat: address!.lat, lng: address!.lng }, halfSideKm);
      await saveCoverageZone({
        center_lat: address!.lat,
        center_lng: address!.lng,
        radius_km: halfSideKm,
        zone_type: 'square',
        bounds_json: zoneBounds,
        role: user!.role,
      });
      setAddressDirty(false);
      await fetchMe();
      toast(`Zone carrée de ${Math.round(halfSideKm)} km enregistrée`, { type: 'success' });
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
        <Skeleton height={280} borderRadius={radius.xl} />
        <SkeletonList count={1} itemHeight={80} gap={spacing[3]} />
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
            leading={<AlertTriangle size={iconSize.sm} color={c.warning} strokeWidth={2} />}
          >
            <AppText style={styles.alertText}>
              {hideAddressCard
                ? 'Renseignez une adresse professionnelle valide dans Coordonnées (suggestion avec GPS).'
                : "Définissez d'abord votre adresse pour configurer votre zone de couverture."}
            </AppText>
          </Cluster>
        </View>
      ) : (
        <>
          <CoverageSquareMapLive
            lat={address!.lat}
            lng={address!.lng}
            halfSideKm={halfSideKm}
            maxHalfSideKm={maxHalfSideKm}
            height={240}
            readOnly
            showHint={false}
          />
          <View style={styles.previewMeta}>
            <View style={styles.previewMetaText}>
              <AppText style={styles.previewSummary}>
                <AppText style={styles.previewSummaryStrong}>{Math.round(halfSideKm)} km</AppText>
                {' du centre au bord · ~'}
                {Math.round(squareAreaKm2(halfSideKm))}
                {' km²'}
              </AppText>
              <AppText style={styles.previewCaption}>
                Touchez « Modifier mon secteur » pour ajuster la zone au doigt.
              </AppText>
            </View>
            <Button
              title="Modifier mon secteur"
              variant="secondary"
              size="md"
              leftIcon={<Maximize2 size={iconSize.sm} color={c.primary} strokeWidth={2} />}
              onPress={() => setEditorOpen(true)}
              style={styles.editSectorBtn}
            />
          </View>

          <SheetModal
            visible={editorOpen}
            onClose={() => setEditorOpen(false)}
            title="Modifier mon secteur"
            subtitle="Glissez un coin du carré pour agrandir ou réduire"
            snapPoints={['100%']}
            disableScroll
            footer={
              <Button
                title="Terminer"
                size="lg"
                fullWidth
                onPress={() => setEditorOpen(false)}
              />
            }
          >
            <CoverageSquareMapLive
              lat={address!.lat}
              lng={address!.lng}
              halfSideKm={halfSideKm}
              maxHalfSideKm={maxHalfSideKm}
              height={editorMapHeight}
              largeHandles
              onHalfSideKmChange={setHalfSideKm}
              onBoundsChange={handleBoundsChange}
              onDragEnd={(half, b) => onDragEnd?.(half, b)}
            />
          </SheetModal>

          {savingZone ? (
            <AppText style={styles.savingHint}>Enregistrement de la zone…</AppText>
          ) : null}
          {showDiscoveryHint && isDiscovery && maxHalfSideKm <= 20 ? (
            <Pressable
              onPress={() => router.push('/(nurse)/abonnement')}
              style={styles.discoveryBanner}
            >
              <AppText style={styles.discoveryText}>
                Offre Découverte : zone limitée à 20 km du centre au bord.{' '}
                <AppText style={styles.discoveryLink}>Passez en Pro</AppText> pour étendre jusqu'à 100 km.
              </AppText>
            </Pressable>
          ) : null}
          {!embedded ? (
            <Button
              title="Enregistrer la zone"
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
        description="Aperçu de votre secteur — modifiez-le en plein écran"
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
              <MapPin size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
              <AppText style={styles.cardTitle}>Adresse professionnelle</AppText>
            </Row>
          </View>
          <AppText style={styles.cardDesc}>Centre de votre zone d'intervention.</AppText>
          <AddressAutocomplete
            value={address}
            complement={addressComplement}
            onChange={onAddressChange}
            onComplementChange={setAddressComplement}
            label="Adresse"
          />
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(60).duration(280).springify()} style={[styles.card, elevation.xs]}>
        <AppText style={styles.cardTitle}>Zone de couverture</AppText>
        <AppText style={styles.cardDesc}>Aperçu de votre secteur — modifiez-le en plein écran</AppText>
        {zoneContent}
      </Animated.View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return StyleSheet.create({
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
      textDecorationLine: 'underline',
    },
    savingHint: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.primary,
      textAlign: 'center',
    },
    previewMeta: {
      gap: spacing[3],
    },
    previewMetaText: {
      gap: spacing[1],
    },
    previewSummary: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    previewSummaryStrong: {
      fontFamily: fontFamily.semiBold,
      color: c.primary,
    },
    previewCaption: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: fontSize.xs * 1.45,
    },
    editSectorBtn: {
      alignSelf: 'stretch',
    },
  });
}
