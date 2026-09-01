/**
 * Zones de couverture (carré legacy ou polygone 6 sommets), centrées sur l'adresse pro.
 * radius_km = distance max centre → sommet (ou demi-côté pour un carré).
 */

import type { GeoPoint } from './tour-geo';

export type { GeoPoint };

export type CoverageBounds = {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
};

export type CoverageVertex = GeoPoint;

export type CoveragePolygonPayload = CoverageBounds & {
  vertices: CoverageVertex[];
};

export type CoverageEditorSavePayload = {
  halfSideKm: number;
  bounds: CoveragePolygonPayload;
  vertices: CoverageVertex[];
};

export type CoverageZoneType = 'circle' | 'square' | 'polygon';

export const COVERAGE_VERTEX_COUNT = 6;
/** Distance min centre → poignée (évite un sommet collé au centre). */
export const MIN_VERTEX_DISTANCE_KM = 0.2;

export const MIN_HALF_SIDE_KM = 5;
export const MAX_HALF_SIDE_KM_LAB = 100;
export const DEFAULT_HALF_SIDE_KM_NURSE = 10;
export const DEFAULT_HALF_SIDE_KM_LAB = 25;

/** Tuiles OpenStreetMap — gratuites, sans clé API. */
export const COVERAGE_MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const COVERAGE_MAP_TILE_SUBDOMAINS = 'abc';
export const COVERAGE_MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const COVERAGE_MAP_TILE_MAX_ZOOM = 19;

/**
 * Zoom Leaflet avec contexte autour du carré (évite fitBounds trop serré).
 * halfSideKm = demi-côté km du centre au bord.
 */
export function zoomForCoverageHalfSideKm(halfSideKm: number): number {
  const r = Math.max(MIN_HALF_SIDE_KM, halfSideKm);
  if (r <= 12) return 11;
  if (r <= 25) return 10;
  if (r <= 45) return 9;
  if (r <= 70) return 8;
  return 7;
}

/** ~km par degré de latitude (WGS84 approximation). */
const KM_PER_DEG_LAT = 111.32;

function kmPerDegLng(lat: number): number {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  return KM_PER_DEG_LAT * Math.max(0.01, Math.abs(cosLat));
}

export function clampHalfSideKm(km: number, maxKm: number, minKm = MIN_HALF_SIDE_KM): number {
  if (!Number.isFinite(km)) return minKm;
  return Math.min(maxKm, Math.max(minKm, km));
}

/** Carré centré sur `center`, demi-côté = halfSideKm (km du centre au bord). */
export function halfSideKmToBounds(center: GeoPoint, halfSideKm: number): CoverageBounds {
  const half = clampHalfSideKm(halfSideKm, MAX_HALF_SIDE_KM_LAB);
  const latDelta = half / KM_PER_DEG_LAT;
  const lngDelta = half / kmPerDegLng(center.lat);
  return {
    min_lat: center.lat - latDelta,
    max_lat: center.lat + latDelta,
    min_lng: center.lng - lngDelta,
    max_lng: center.lng + lngDelta,
  };
}

/** Demi-côté km dérivé des bounds (min des axes lat/lng). */
export function boundsToHalfSideKm(center: GeoPoint, bounds: CoverageBounds): number {
  const latHalf = ((bounds.max_lat - bounds.min_lat) / 2) * KM_PER_DEG_LAT;
  const lngHalf = ((bounds.max_lng - bounds.min_lng) / 2) * kmPerDegLng(center.lat);
  const half = Math.min(latHalf, lngHalf);
  return Number.isFinite(half) && half > 0 ? half : MIN_HALF_SIDE_KM;
}

export function isPointInBounds(point: GeoPoint, bounds: CoverageBounds): boolean {
  return (
    point.lat >= bounds.min_lat &&
    point.lat <= bounds.max_lat &&
    point.lng >= bounds.min_lng &&
    point.lng <= bounds.max_lng
  );
}

/** Surface approximative km² (carré). */
export function squareAreaKm2(halfSideKm: number): number {
  const side = halfSideKm * 2;
  return side * side;
}

/**
 * Resize carré 1:1 depuis un coin draggé ; centre fixe.
 * corner = position du coin en drag.
 */
export function resizeSquareFromCorner(
  center: GeoPoint,
  corner: GeoPoint,
  maxHalfSideKm: number,
  minHalfSideKm = MIN_HALF_SIDE_KM,
): { bounds: CoverageBounds; halfSideKm: number } {
  const dLatKm = Math.abs(corner.lat - center.lat) * KM_PER_DEG_LAT;
  const dLngKm = Math.abs(corner.lng - center.lng) * kmPerDegLng(center.lat);
  const rawHalf = Math.max(dLatKm, dLngKm);
  const halfSideKm = clampHalfSideKm(rawHalf, maxHalfSideKm, minHalfSideKm);
  return {
    halfSideKm,
    bounds: halfSideKmToBounds(center, halfSideKm),
  };
}

export function boundsAreSquareConsistent(
  center: GeoPoint,
  bounds: CoverageBounds,
  toleranceRatio = 0.02,
): boolean {
  const half = boundsToHalfSideKm(center, bounds);
  const expected = halfSideKmToBounds(center, half);
  const tolLat = Math.max(0.0001, (expected.max_lat - expected.min_lat) * toleranceRatio);
  const tolLng = Math.max(0.0001, (expected.max_lng - expected.min_lng) * toleranceRatio);
  return (
    Math.abs(bounds.min_lat - expected.min_lat) <= tolLat &&
    Math.abs(bounds.max_lat - expected.max_lat) <= tolLat &&
    Math.abs(bounds.min_lng - expected.min_lng) <= tolLng &&
    Math.abs(bounds.max_lng - expected.max_lng) <= tolLng &&
    half >= MIN_HALF_SIDE_KM
  );
}

export function normalizeBounds(raw: unknown): CoverageBounds | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const min_lat = Number(b.min_lat);
  const max_lat = Number(b.max_lat);
  const min_lng = Number(b.min_lng);
  const max_lng = Number(b.max_lng);
  if (
    !Number.isFinite(min_lat) ||
    !Number.isFinite(max_lat) ||
    !Number.isFinite(min_lng) ||
    !Number.isFinite(max_lng) ||
    max_lat <= min_lat ||
    max_lng <= min_lng
  ) {
    return null;
  }
  return { min_lat, max_lat, min_lng, max_lng };
}

/** Bounds AABB pour une zone (polygone, carré ou fallback). */
export function resolveZoneBounds(
  zoneType: CoverageZoneType | string | null | undefined,
  center: GeoPoint,
  radiusKm: number,
  boundsJson: unknown,
): CoverageBounds {
  const vertices = normalizeVertices(boundsJson);
  if (vertices && vertices.length >= 3) {
    return verticesToBounds(vertices);
  }
  const bounds = normalizeBounds(boundsJson);
  if ((zoneType === 'square' || zoneType === 'polygon') && bounds) {
    return bounds;
  }
  const half = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : MIN_HALF_SIDE_KM;
  return halfSideKmToBounds(center, half);
}

export function offsetPointByKm(center: GeoPoint, distanceKm: number, bearingDeg: number): GeoPoint {
  const rad = (bearingDeg * Math.PI) / 180;
  return {
    lat: center.lat + (distanceKm * Math.cos(rad)) / KM_PER_DEG_LAT,
    lng: center.lng + (distanceKm * Math.sin(rad)) / kmPerDegLng(center.lat),
  };
}

export function planarDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.lat - a.lat) * KM_PER_DEG_LAT;
  const dLng = (b.lng - a.lng) * kmPerDegLng(a.lat);
  return Math.hypot(dLat, dLng);
}

export function planarBearingDeg(from: GeoPoint, to: GeoPoint): number {
  const dLat = (to.lat - from.lat) * KM_PER_DEG_LAT;
  const dLng = (to.lng - from.lng) * kmPerDegLng(from.lat);
  const deg = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Carré par défaut — 6 poignées (sens horaire depuis le coin NO) :
 * 4 angles + milieu du côté Nord + milieu du côté Sud.
 * (Tirer une poignée déforme librement le polygone.)
 */
export function defaultSquareVertices(center: GeoPoint, halfSideKm: number): CoverageVertex[] {
  const half = Math.max(MIN_VERTEX_DISTANCE_KM, halfSideKm);
  const latD = half / KM_PER_DEG_LAT;
  const lngD = half / kmPerDegLng(center.lat);
  const { lat, lng } = center;
  return [
    { lat: lat + latD, lng: lng - lngD }, // angle NO
    { lat: lat + latD, lng }, // milieu côté Nord
    { lat: lat + latD, lng: lng + lngD }, // angle NE
    { lat: lat - latD, lng: lng + lngD }, // angle SE
    { lat: lat - latD, lng }, // milieu côté Sud
    { lat: lat - latD, lng: lng - lngD }, // angle SO
  ];
}

/** @deprecated Préférer defaultSquareVertices */
export function defaultSquareSixVertices(center: GeoPoint, halfSideKm: number): CoverageVertex[] {
  return defaultSquareVertices(center, halfSideKm);
}

/** @deprecated Préférer defaultSquareVertices */
export function regularHexagonVertices(center: GeoPoint, halfSideKm: number): CoverageVertex[] {
  return defaultSquareVertices(center, halfSideKm);
}

export function clampVertexToMaxKm(
  center: GeoPoint,
  vertex: GeoPoint,
  maxKm: number,
  minKm = MIN_VERTEX_DISTANCE_KM,
): CoverageVertex {
  const d = planarDistanceKm(center, vertex);
  const bearing = d <= 1e-9 ? 0 : planarBearingDeg(center, vertex);
  if (d < minKm) return offsetPointByKm(center, minKm, bearing);
  if (d > maxKm) return offsetPointByKm(center, maxKm, bearing);
  return { lat: vertex.lat, lng: vertex.lng };
}

export function clampVerticesToMaxKm(
  center: GeoPoint,
  vertices: CoverageVertex[],
  maxKm: number,
): CoverageVertex[] {
  return vertices.map((v) => clampVertexToMaxKm(center, v, maxKm));
}

export function verticesToBounds(vertices: CoverageVertex[]): CoverageBounds {
  const lats = vertices.map((v) => v.lat);
  const lngs = vertices.map((v) => v.lng);
  return {
    min_lat: Math.min(...lats),
    max_lat: Math.max(...lats),
    min_lng: Math.min(...lngs),
    max_lng: Math.max(...lngs),
  };
}

export function maxVertexDistanceKm(center: GeoPoint, vertices: CoverageVertex[]): number {
  if (!vertices.length) return 0;
  return Math.max(...vertices.map((v) => planarDistanceKm(center, v)));
}

/** Surface approx. km² (formule du lacet, projection locale). */
export function polygonAreaKm2(vertices: CoverageVertex[]): number {
  if (vertices.length < 3) return 0;
  const meanLat = vertices.reduce((s, v) => s + v.lat, 0) / vertices.length;
  const kx = kmPerDegLng(meanLat);
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const xi = vertices[i].lng * kx;
    const yi = vertices[i].lat * KM_PER_DEG_LAT;
    const xj = vertices[j].lng * kx;
    const yj = vertices[j].lat * KM_PER_DEG_LAT;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area) / 2;
}

/** Ray casting (lat/lng). */
export function pointInPolygon(point: GeoPoint, vertices: CoverageVertex[]): boolean {
  if (vertices.length < 3) return false;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const yi = vertices[i].lat;
    const yj = vertices[j].lat;
    const xi = vertices[i].lng;
    const xj = vertices[j].lng;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 1e-15) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function normalizeVertices(raw: unknown): CoverageVertex[] | null {
  if (!raw) return null;
  let list: unknown[] | null = null;
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'object') {
    const verts = (raw as Record<string, unknown>).vertices;
    if (Array.isArray(verts)) list = verts;
  }
  if (!list || list.length < 3) return null;
  const vertices: CoverageVertex[] = [];
  for (const item of list) {
    if (Array.isArray(item) && item.length >= 2) {
      const lat = Number(item[0]);
      const lng = Number(item[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      vertices.push({ lat, lng });
      continue;
    }
    if (!item || typeof item !== 'object') return null;
    const v = item as Record<string, unknown>;
    const lat = Number(v.lat);
    const lng = Number(v.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    vertices.push({ lat, lng });
  }
  return vertices;
}

export function toPolygonPayload(vertices: CoverageVertex[]): CoveragePolygonPayload {
  return { ...verticesToBounds(vertices), vertices };
}

export function ensureSixVertices(
  center: GeoPoint,
  vertices: CoverageVertex[] | null | undefined,
  radiusKm: number,
): CoverageVertex[] {
  return ensureCoverageVertices(center, vertices, radiusKm);
}

/** 4 coins + 2 milieux de côté (6 par défaut). */
export function ensureCoverageVertices(
  center: GeoPoint,
  vertices: CoverageVertex[] | null | undefined,
  radiusKm: number,
): CoverageVertex[] {
  if (vertices && vertices.length === COVERAGE_VERTEX_COUNT) {
    return vertices.map((v) => ({ lat: v.lat, lng: v.lng }));
  }
  const r =
    vertices && vertices.length >= 3
      ? maxVertexDistanceKm(center, vertices)
      : Number.isFinite(radiusKm) && radiusKm > 0
        ? radiusKm
        : DEFAULT_HALF_SIDE_KM_NURSE;
  return defaultSquareVertices(center, r);
}

export function resolveCoverageVertices(
  center: GeoPoint,
  radiusKm: number,
  boundsJson: unknown,
): CoverageVertex[] {
  return ensureSixVertices(center, normalizeVertices(boundsJson), radiusKm);
}
