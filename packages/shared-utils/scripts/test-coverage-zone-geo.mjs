/**
 * Tests geo zones carrées (Node, sans Vitest).
 * Usage: node packages/shared-utils/scripts/test-coverage-zone-geo.mjs
 */

import {
  halfSideKmToBounds,
  boundsToHalfSideKm,
  isPointInBounds,
  boundsAreSquareConsistent,
  clampHalfSideKm,
  resizeSquareFromCorner,
  resolveZoneBounds,
  MIN_HALF_SIDE_KM,
  defaultSquareVertices,
  pointInPolygon,
  polygonAreaKm2,
  clampVertexToMaxKm,
  maxVertexDistanceKm,
  ensureSixVertices,
  toPolygonPayload,
  COVERAGE_VERTEX_COUNT,
} from '../src/coverage-zone-geo.ts';

function assert(cond, msg) {
  if (!cond) {
    console.error('[FAIL]', msg);
    process.exit(1);
  }
  console.log('[OK]', msg);
}

const center = { lat: 48.8566, lng: 2.3522 };
const half = 15;

const bounds = halfSideKmToBounds(center, half);
assert(isPointInBounds(center, bounds), 'Centre dans bounds');
assert(
  isPointInBounds({ lat: center.lat + 0.05, lng: center.lng }, bounds),
  'Point proche dans bounds',
);
assert(
  !isPointInBounds({ lat: 50.0, lng: 3.0 }, bounds),
  'Lille hors bounds Paris',
);

const roundTrip = boundsToHalfSideKm(center, bounds);
assert(Math.abs(roundTrip - half) < 0.5, 'Round-trip demi-côté ~15 km');

assert(boundsAreSquareConsistent(center, bounds), 'Bounds cohérents');

assert(clampHalfSideKm(25, 20) === 20, 'Clamp max plan 20');
assert(clampHalfSideKm(3, 100) === MIN_HALF_SIDE_KM, 'Clamp min 5 km');

const resized = resizeSquareFromCorner(
  center,
  { lat: center.lat + 0.2, lng: center.lng + 0.2 },
  100,
);
assert(resized.halfSideKm >= MIN_HALF_SIDE_KM, 'Resize depuis coin');

const legacy = resolveZoneBounds('square', center, 20, null);
assert(isPointInBounds(center, legacy), 'Legacy sans bounds_json → carré depuis radius');

const square = defaultSquareVertices(center, 15);
assert(square.length === COVERAGE_VERTEX_COUNT, 'Carré = 6 poignées (4 angles + 2 milieux)');
assert(pointInPolygon(center, square), 'Centre dans le carré');
assert(polygonAreaKm2(square) > 800, 'Surface carré 15 km > 800 km²');
assert(
  !pointInPolygon({ lat: 50.0, lng: 3.0 }, square),
  'Lille hors carré Paris',
);

const pulled = clampVertexToMaxKm(center, { lat: center.lat + 2, lng: center.lng }, 20);
assert(maxVertexDistanceKm(center, [pulled]) <= 20.05, 'Poignée clampée au max plan');

const payload = toPolygonPayload(square);
assert(payload.vertices.length === 6, 'Payload vertices');
assert(payload.max_lat > payload.min_lat, 'AABB du polygone');

const six = ensureSixVertices(center, square.slice(0, 4), 12);
assert(six.length === 6, 'ensureSixVertices complète à 6');

console.log('\n=== Tous les tests shared-utils OK ===');
