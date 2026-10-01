import { useCallback, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeletons';
import type { AddressPayload } from '@/features/appointments/form/types';
import { CoverageSquareMapLive } from '@/features/profile/components/CoverageSquareMapLive';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { fetchCoverageZones } from '@/features/profile/api/profile.service';
import { hasValidGeoAddress } from '@/features/profile/utils/parse-profile-address';
import { api } from '@/api/client';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useAppColors } from '@/theme/use-app-colors';
import { radius, spacing, iconSize, ICON_STROKE_WIDTH, AppText, useStyles, font, type Theme } from '@/theme';
import type { CoveragePolygonPayload, CoverageVertex } from '@oneandlab/shared-utils';
import { ensureSixVertices, maxVertexDistanceKm, polygonAreaKm2, toPolygonPayload } from '@oneandlab/shared-utils';

const DISCOVERY_MAX_HALF_SIDE_KM = 20;

type PlanLimits = {
  plan_slug?: string;
  max_radius_km?: number;
};

interface Props {
  address: AddressPayload | null;
  halfSideKm: number;
  onSaveZone: (halfSideKm: number, bounds: CoveragePolygonPayload) => Promise<boolean>;
  savingZone: boolean;
}

/** Secteur d’intervention infirmier : carte en lecture, édition au doigt puis enregistrement. */
export function ProfileCoverageEditor({ address, halfSideKm, onSaveZone, savingZone }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [vertices, setVertices] = useState<CoverageVertex[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftHalfSide, setDraftHalfSide] = useState(halfSideKm);
  const [draftVertices, setDraftVertices] = useState<CoverageVertex[] | null>(null);

  const { height: windowHeight } = useWindowDimensions();
  const mapHeight = editing
    ? Math.max(220, Math.min(440, windowHeight * 0.5))
    : Math.max(200, Math.min(280, windowHeight * 0.32));

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

  const maxHalfSideKm = limitsQ.data?.max_radius_km ?? DISCOVERY_MAX_HALF_SIDE_KM;
  const isDiscovery = limitsQ.data?.plan_slug === 'discovery';

  useEffect(() => {
    const zone = zoneQ.data?.[0];
    if (zone?.bounds_json && typeof zone.bounds_json === 'object') {
      const b = zone.bounds_json as CoveragePolygonPayload;
      if (Array.isArray(b.vertices) && b.vertices.length >= 3) {
        setVertices(b.vertices);
      }
    }
  }, [zoneQ.data]);

  const resetDraft = useCallback(() => {
    if (!hasValidGeoAddress(address)) return;
    const center = { lat: address!.lat, lng: address!.lng };
    const verts = ensureSixVertices(center, vertices, halfSideKm);
    setDraftVertices(verts);
    setDraftHalfSide(maxVertexDistanceKm(center, verts));
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
    const reach = maxVertexDistanceKm(center, verts);
    if (!(await onSaveZone(reach, toPolygonPayload(verts)))) return;
    setVertices(verts);
    setEditing(false);
  }, [address, draftVertices, draftHalfSide, vertices, onSaveZone, savingZone]);

  const onVerticesChange = useCallback(
    (v: CoverageVertex[]) => {
      if (editing) setDraftVertices(v);
    },
    [editing],
  );

  if (limitsQ.isLoading || zoneQ.isLoading) {
    return <Skeleton height={280} borderRadius={radius.lg} />;
  }

  if (limitsQ.isError || zoneQ.isError) {
    return (
      <ErrorState
        title="Secteur indisponible"
        error={limitsQ.error ?? zoneQ.error}
        onRetry={() => {
          void limitsQ.refetch();
          void zoneQ.refetch();
        }}
      />
    );
  }

  if (!hasValidGeoAddress(address)) {
    return (
      <ProfileSection title="Secteur d’intervention">
        <AppText variant="secondary">
          Renseignez votre adresse professionnelle pour définir votre secteur.
        </AppText>
        <Button
          title="Compléter mes coordonnées"
          variant="secondary"
          onPress={() => router.push('/profile/nurse/coordinates')}
        />
      </ProfileSection>
    );
  }

  const center = { lat: address!.lat, lng: address!.lng };
  const shownVertices = ensureSixVertices(
    center,
    editing ? draftVertices : vertices,
    editing ? draftHalfSide : halfSideKm,
  );
  const reachKm = Math.round(maxVertexDistanceKm(center, shownVertices));
  const areaKm2 = Math.round(polygonAreaKm2(shownVertices));

  return (
    <ProfileSection
      title="Secteur d’intervention"
      description="Les quartiers où vous souhaitez recevoir des demandes de soins."
    >
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
        onHalfSideKmChange={editing ? setDraftHalfSide : undefined}
        onVerticesChange={onVerticesChange}
      />
      <AppText variant="secondary">
        <AppText style={styles.strong}>{reachKm} km</AppText>
        {` au maximum de votre adresse · ~${areaKm2} km²`}
      </AppText>
      {editing ? (
        <>
          <AppText variant="caption">Glissez les poignées puis enregistrez.</AppText>
          <Row gap={spacing[2]} wrap justify="end">
            <Button title="Annuler" variant="ghost" size="md" onPress={cancelEdit} disabled={savingZone} />
            <Button title="Enregistrer mon secteur" size="md" loading={savingZone} onPress={() => void validateEdit()} />
          </Row>
        </>
      ) : (
        <Button
          title="Modifier mon secteur"
          variant="secondary"
          size="md"
          leftIcon={<Pencil size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />}
          onPress={startEdit}
          fullWidth
        />
      )}
      {isDiscovery && maxHalfSideKm <= DISCOVERY_MAX_HALF_SIDE_KM ? (
        <View style={styles.discovery}>
          <AppText variant="caption">
            Offre Découverte : secteur limité à {DISCOVERY_MAX_HALF_SIDE_KM} km. L’offre Pro l’étend jusqu’à 100 km.
          </AppText>
          <Button title="Voir l’offre Pro" variant="ghost" size="md" onPress={() => router.push('/(nurse)/abonnement')} />
        </View>
      ) : null}
    </ProfileSection>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    strong: {
      ...font.semiBold,
      color: c.textPrimary,
    },
    discovery: {
      gap: spacing[1],
      alignItems: 'flex-start' as const,
    },
  };
}
