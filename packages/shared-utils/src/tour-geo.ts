export type GeoPoint = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

/** Distance à vol d'oiseau (km) — 0 € API. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Estimation conduite urbaine (~35 km/h). */
export function estimateDriveMin(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / 35) * 60));
}

export type NearestNeighborItem<T> = T & { point: GeoPoint };

/**
 * Ordre nearest-neighbor depuis un point de départ.
 * Les items sans coords valides restent en fin dans l'ordre d'origine.
 */
export function nearestNeighborOrder<T>(
  start: GeoPoint,
  items: NearestNeighborItem<T>[],
): T[] {
  const valid = items.filter(
    (i) => Number.isFinite(i.point.lat) && Number.isFinite(i.point.lng) && !(i.point.lat === 0 && i.point.lng === 0),
  );
  const invalid = items.filter((i) => !valid.includes(i));
  const remaining = [...valid];
  const ordered: T[] = [];
  let cursor = start;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(cursor, remaining[i]!.point);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!;
    ordered.push(next);
    cursor = next.point;
  }

  return [...ordered, ...invalid];
}

/** Normalise lat/lng depuis un RDV (form_data ou champs top-level). */
export function coordsFromAppointmentLike(row: {
  location_lat?: number | string | null;
  location_lng?: number | string | null;
  form_data?: { address?: { lat?: number; lng?: number } | string | null } | null;
}): GeoPoint | null {
  const fd = row.form_data;
  if (fd && typeof fd.address === 'object' && fd.address !== null) {
    const lat = Number(fd.address.lat);
    const lng = Number(fd.address.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      return { lat, lng };
    }
  }
  const lat = Number(row.location_lat);
  const lng = Number(row.location_lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }
  return null;
}
