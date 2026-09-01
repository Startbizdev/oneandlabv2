/**
 * Zones de couverture carrées (axis-aligned), centrées sur l'adresse pro.
 * demi-côté (halfSideKm) = distance centre → bord = radius_km en base.
 */

import type { GeoPoint } from './tour-geo';

export type { GeoPoint };

export type CoverageBounds = {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
};

export type CoverageZoneType = 'circle' | 'square';

export const MIN_HALF_SIDE_KM = 5;
export const MAX_HALF_SIDE_KM_LAB = 100;
export const DEFAULT_HALF_SIDE_KM_NURSE = 10;
export const DEFAULT_HALF_SIDE_KM_LAB = 25;

/** Tuiles OSM gratuites (sans clé API — Carto basemaps exige une clé). */
export const COVERAGE_MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const COVERAGE_MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Zoom Leaflet avec contexte autour du carré (évite fitBounds trop serré).
 * halfSideKm = demi-côté km du centre au bord.
 */
export function zoomForCoverageHalfSideKm(halfSideKm: number): number {
  const r = Math.max(MIN_HALF_SIDE_KM, halfSideKm);
  if (r <= 12) return 9;
  if (r <= 25) return 8;
  if (r <= 45) return 7;
  if (r <= 70) return 6;
  return 5;
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

/** Bounds effectifs pour une zone (carré ou fallback cercle → carré legacy). */
export function resolveZoneBounds(
  zoneType: CoverageZoneType | string | null | undefined,
  center: GeoPoint,
  radiusKm: number,
  boundsJson: unknown,
): CoverageBounds {
  const bounds = normalizeBounds(boundsJson);
  if (zoneType === 'square' && bounds) {
    return bounds;
  }
  const half = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : MIN_HALF_SIDE_KM;
  return halfSideKmToBounds(center, half);
}
