import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MapPin, Pencil } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
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
import type { CoveragePolygonPayload, CoverageVertex } from '@oneandlab/shared-utils';
import { ensureSixVertices, maxVertexDistanceKm, polygonAreaKm2, toPolygonPayload } from '@oneandlab/shared-utils';

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
  onBoundsChange?: (bounds: CoveragePolygonPayload) => void;
  onVerticesChange?: (vertices: CoverageVertex[]) => void;
  onSaveZone?: (halfSideKm: number, bounds: CoveragePolygonPayload, vertices: CoverageVertex[]) => Promise<boolean>;
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
  onVerticesChange,
  onSaveZone,
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
  const [bounds, setBounds] = useState<CoveragePolygonPayload | null>(null);
  const [vertices, setVertices] = useState<CoverageVertex[] | null>(null);
  const [addressDirty, setAddressDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftHalfSide, setDraftHalfSide] = useState(DEFAULT_RADIUS);
  const [draftVertices, setDraftVertices] = useState<CoverageVertex[] | null>(null);
  const [draftBounds, setDraftBounds] = useState<CoveragePolygonPayload | null>(null);

  const { height: windowHeight } = useWindowDimensions();
  const mapHeight = editing
    ? Math.max(220, Math.min(440, windowHeight * 0.5))
    : Math.max(200, Math.min(280, windowHeight * 0.32));

  const halfSideKm = controlledHalfSide ?? internalHalfSide;
  const setHalfSideKm = onHalfSideKmChange ?? setInternalHalfSide;

  const userQ = useQuery({
    queryKey: queryKeys.profile.fullUser(user?.id ?? ''),
    queryFn: async () => {
      const res = await fetchUser(user!.id, 'full');
      if (!res.success || !res.data) throw new Error('Profil indisponible');
      return res.data;
    },
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
    queryFn: async () => {
      const res = await api.get<PlanLimits>('/plan-limits');
      if (!res.success || !res.data || !Number.isFinite(res.data.max_radius_km)) throw new Error('Limites de votre offre indisponibles');
      return res.data;
    },
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
      const b = zone.bounds_json as CoveragePolygonPayload;
      setBounds(b);
      if (Array.isArray(b.vertices) && b.vertices.length >= 3) {
        setVertices(b.vertices);
      }
    }
  }, [zoneQ.data, maxHalfSideKm, controlledHalfSide]);

  const handleBoundsChange = useCallback(
    (b: CoveragePolygonPayload) => {
      setBounds(b);
      onBoundsChange?.(b);
    },
    [onBoundsChange],
  );

  const handleVerticesChange = useCallback(
    (v: CoverageVertex[]) => {
      if (editing) {
        setDraftVertices(v);
      } else {
        setVertices(v);
      }
      onVerticesChange?.(v);
    },
    [editing, onVerticesChange],
  );

  const resetDraft = useCallback(() => {
    if (!hasValidGeoAddress(address)) return;
    const center = { lat: address!.lat, lng: address!.lng };
    const verts = ensureSixVertices(center, vertices, halfSideKm);
    setDraftVertices(verts);
    setDraftHalfSide(maxVertexDistanceKm(center, verts));
    setDraftBounds(toPolygonPayload(verts));
  }, [address, vertices, halfSideKm]);

  const startEdit = useCallback(() => {
    resetDraft();
    setEditing(true);
  }, [resetDraft]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    resetDraft();
  }, [resetDraft]);

  const validateEdit = useCallback(async () => {
    if (savingZone || !hasValidGeoAddress(address)) return;
    const center = { lat: address!.lat, lng: address!.lng };
    const verts = ensureSixVertices(center, draftVertices ?? vertices, draftHalfSide);
    const b = toPolygonPayload(verts);
    const reach = maxVertexDistanceKm(center, verts);
    if (onSaveZone && !(await onSaveZone(reach, b, verts))) return;
    setHalfSideKm(reach);
    setBounds(b);
    setVertices(verts);
    setEditing(false);
  }, [address, draftVertices, draftHalfSide, vertices, setHalfSideKm, onSaveZone, savingZone]);

  const onAddressChange = useCallback((addr: AddressPayload | null) => {
    setAddress(addr);
    setAddressDirty(true);
  }, []);

  const saveStandalone = async () => {
    if (saving || limitsQ.isError || zoneQ.isError || userQ.isError) return;
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
      const zoneVertices = ensureSixVertices(
        { lat: address!.lat, lng: address!.lng },
        vertices,
        halfSideKm,
      );
      const zoneBounds = toPolygonPayload(zoneVertices);
      const reach = maxVertexDistanceKm({ lat: address!.lat, lng: address!.lng }, zoneVertices);
      await saveCoverageZone({
        center_lat: address!.lat,
        center_lng: address!.lng,
        radius_km: reach,
        zone_type: 'polygon',
        bounds_json: zoneBounds,
        role: user!.role,
      });
      setAddressDirty(false);
      await fetchMe();
      toast(`Zone de ${Math.round(reach)} km enregistrée`, { type: 'success' });
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

  if (limitsQ.isError || zoneQ.isError || (!embedded && userQ.isError)) {
    return <View style={styles.stack}>
      <AppText style={styles.cardDesc}>Impossible de charger votre secteur et les limites de votre offre.</AppText>
      <Button title="Réessayer" loading={limitsQ.isFetching || zoneQ.isFetching || userQ.isFetching} onPress={() => {
        if (user?.role === 'nurse') { void limitsQ.refetch(); void zoneQ.refetch(); }
        if (!embedded) void userQ.refetch();
      }} />
    </View>;
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
            halfSideKm={editing ? draftHalfSide : halfSideKm}
            maxHalfSideKm={maxHalfSideKm}
            vertices={editing ? draftVertices : vertices}
            height={mapHeight}
            readOnly={!editing}
            largeHandles={editing}
            showSummary={false}
            showHint={false}
            onHalfSideKmChange={editing ? setDraftHalfSide : setHalfSideKm}
            onBoundsChange={editing ? setDraftBounds : handleBoundsChange}
            onVerticesChange={handleVerticesChange}
          />
          <View style={styles.previewMeta}>
            <View style={styles.previewMetaText}>
              <AppText style={styles.previewSummary}>
                <AppText style={styles.previewSummaryStrong}>
                  {Math.round(
                    maxVertexDistanceKm(
                      { lat: address!.lat, lng: address!.lng },
                      ensureSixVertices(
                        { lat: address!.lat, lng: address!.lng },
                        editing ? draftVertices : vertices,
                        editing ? draftHalfSide : halfSideKm,
                      ),
                    ),
                  )}{' '}
                  km
                </AppText>
                {' au maximum de votre adresse · ~'}
                {Math.round(
                  polygonAreaKm2(
                    ensureSixVertices(
                      { lat: address!.lat, lng: address!.lng },
                      editing ? draftVertices : vertices,
                      editing ? draftHalfSide : halfSideKm,
                    ),
                  ),
                )}
                {' km²'}
              </AppText>
              <AppText style={styles.previewCaption}>
                {editing
                  ? 'Glissez les poignées puis validez.'
                  : 'Touchez « Modifier mon secteur » pour ajuster la zone au doigt.'}
              </AppText>
            </View>
            {editing ? (
              <Row gap={spacing[2]} wrap justify="end">
                <Button title="Annuler" variant="ghost" size="md" onPress={cancelEdit} disabled={savingZone} />
                <Button title={onSaveZone ? 'Enregistrer mon secteur' : 'Appliquer le tracé'} size="md" loading={savingZone} onPress={() => void validateEdit()} />
              </Row>
            ) : (
              <Button
                title="Modifier mon secteur"
                variant="secondary"
                size="md"
                leftIcon={<Pencil size={iconSize.sm} color={c.primary} strokeWidth={2} />}
                onPress={startEdit}
                style={styles.editSectorBtn}
              />
            )}
          </View>

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
        title="Votre secteur d’intervention"
        description="Les quartiers où vous souhaitez recevoir des demandes de soins."
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
        <AppText style={styles.cardTitle}>Votre secteur d’intervention</AppText>
        <AppText style={styles.cardDesc}>Les quartiers où vous souhaitez recevoir des demandes de soins.</AppText>
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
  } satisfies Parameters<typeof StyleSheet.create>[0];
}
